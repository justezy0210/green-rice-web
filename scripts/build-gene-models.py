#!/usr/bin/env python3
"""Build per-gene model + functional annotation index from funannotate GFF3.

Runs on server where funannotate_v2 results live:
  /10Gdata/ezy/02_Ongoing_Projects/00_Main/Green_Rice/results/funannotate_v2/
     {cultivar}/annotate_results/{cultivar}.gff3

For each gene in each cultivar:
  - Pick representative transcript (longest total CDS).
  - Flatten to {exons, UTR5, UTR3, CDS segments}. UTR computed as
    exon − CDS set difference; introns inferred client-side from exon gaps.
  - Extract functional annotation from the mRNA attributes:
      product, GO, Pfam, InterPro, COG, EggNog.

Output (Storage upload):
  gene_models/v{N}/_manifest.json         — per-cultivar gene counts, prefix list
  gene_models/v{N}/by_prefix/{PR}.json    — partitioned gene dicts

Partition key = first 2 alphanumeric chars of gene ID, uppercased
(same convention as scripts/build-gene-og-index.py).

Usage:
  python3 scripts/build-gene-models.py \\
      --funannotate-dir /10Gdata/.../results/funannotate_v2 \\
      --version 6
  python3 scripts/build-gene-models.py ... --dry-run
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from collections import defaultdict
from pathlib import Path
from urllib.parse import unquote

BUCKET = "green-rice-db.firebasestorage.app"
PROJECT_ROOT = Path(__file__).resolve().parent.parent

CULTIVARS = [
    "baegilmi", "chamdongjin", "chindeul", "hyeonpum",
    "jopyeong", "jungmo1024", "namchan", "namil",
    "pyeongwon", "saeilmi", "samgwang",
]


def init_firebase():
    import firebase_admin
    from firebase_admin import credentials, storage
    sa = PROJECT_ROOT / "service-account.json"
    if not sa.exists():
        raise SystemExit("service-account.json missing at repo root.")
    try:
        firebase_admin.get_app()
    except ValueError:
        firebase_admin.initialize_app(credentials.Certificate(str(sa)),
                                      {"storageBucket": BUCKET})
    return storage.bucket()


def prefix_for_gene_id(gene_id: str) -> str:
    s = re.sub(r"[^A-Za-z0-9]", "", gene_id)[:2].upper()
    return s if len(s) == 2 else "__"


def parse_attrs(field: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for pair in field.rstrip(";").split(";"):
        if "=" in pair:
            k, v = pair.split("=", 1)
            out[k.strip()] = unquote(v.strip())
    return out


def subtract_cds_from_exons(
    exons: list[tuple[int, int]],
    cds: list[tuple[int, int]],
    strand: str,
) -> tuple[list[dict], list[dict], list[dict]]:
    """Return (utr5, cds_parts, utr3) as lists of {start, end}.

    UTR is exon ∖ CDS. On + strand, UTR before the first CDS is 5', after
    the last CDS is 3'. Flipped on − strand.
    """
    if not cds:
        # No CDS: everything is UTR, but we can't tell 5 vs 3. Skip both.
        return [], [], []
    cds_min = min(s for s, _ in cds)
    cds_max = max(e for _, e in cds)

    utr_left: list[dict] = []
    utr_right: list[dict] = []
    cds_parts = [{"start": s, "end": e} for s, e in sorted(cds)]

    for s, e in sorted(exons):
        # Left UTR: portion of exon strictly before cds_min
        if s < cds_min:
            utr_left.append({"start": s, "end": min(e, cds_min - 1)})
        # Right UTR: portion strictly after cds_max
        if e > cds_max:
            utr_right.append({"start": max(s, cds_max + 1), "end": e})

    if strand == "-":
        # On − strand, left (low coord) is 3', right (high coord) is 5'
        return utr_right, cds_parts, utr_left
    return utr_left, cds_parts, utr_right


def extract_annotation(attrs: dict[str, str]) -> dict:
    ann: dict = {}
    if "product" in attrs:
        ann["product"] = attrs["product"]
    if "Ontology_term" in attrs:
        go = [t for t in attrs["Ontology_term"].split(",") if t.startswith("GO:")]
        if go:
            ann["go"] = go
    if "Dbxref" in attrs:
        pfam = []
        interpro = []
        for x in attrs["Dbxref"].split(","):
            x = x.strip()
            if x.startswith("PFAM:"):
                pfam.append(x[len("PFAM:"):])
            elif x.startswith("InterPro:"):
                interpro.append(x[len("InterPro:"):])
        if pfam:
            ann["pfam"] = pfam
        if interpro:
            ann["interpro"] = interpro
    if "note" in attrs:
        for item in attrs["note"].split(","):
            item = item.strip()
            if item.startswith("COG:"):
                ann["cog"] = item[len("COG:"):]
            elif item.startswith("EggNog:"):
                ann["eggnog"] = item[len("EggNog:"):]
    return ann


def parse_cultivar_gff(path: Path, cultivar: str) -> dict[str, dict]:
    """Return {gene_id: {cultivar, chr, start, end, strand, transcript, annotation}}.

    Representative transcript = mRNA with longest total CDS.
    """
    # First pass: gather genes + mRNA → exons/CDS
    gene_info: dict[str, dict] = {}
    mrna_info: dict[str, dict] = {}
    mrna_exons: dict[str, list[tuple[int, int]]] = defaultdict(list)
    mrna_cds: dict[str, list[tuple[int, int]]] = defaultdict(list)

    with open(path) as f:
        for line in f:
            if line.startswith("#") or not line.strip():
                continue
            cols = line.rstrip("\n").split("\t")
            if len(cols) < 9:
                continue
            feature = cols[2]
            chrom = cols[0]
            start = int(cols[3])
            end = int(cols[4])
            strand = cols[6]
            attrs = parse_attrs(cols[8])
            fid = attrs.get("ID", "")
            parent = attrs.get("Parent", "")

            if feature == "gene":
                if fid:
                    gene_info[fid] = {
                        "cultivar": cultivar,
                        "chr": chrom,
                        "start": start,
                        "end": end,
                        "strand": strand,
                    }
            elif feature == "mRNA":
                if fid and parent:
                    mrna_info[fid] = {
                        "gene_id": parent,
                        "chr": chrom,
                        "start": start,
                        "end": end,
                        "strand": strand,
                        "attrs": attrs,
                    }
            elif feature == "exon":
                if parent:
                    mrna_exons[parent].append((start, end))
            elif feature == "CDS":
                if parent:
                    mrna_cds[parent].append((start, end))

    # Second pass: pick representative mRNA per gene (longest total CDS)
    gene_to_best: dict[str, str] = {}
    gene_to_best_len: dict[str, int] = {}
    for mrna_id, info in mrna_info.items():
        gid = info["gene_id"]
        total_cds = sum(e - s + 1 for s, e in mrna_cds.get(mrna_id, []))
        if total_cds > gene_to_best_len.get(gid, -1):
            gene_to_best[gid] = mrna_id
            gene_to_best_len[gid] = total_cds

    # Build final entries
    out: dict[str, dict] = {}
    for gid, ginfo in gene_info.items():
        best_mrna = gene_to_best.get(gid)
        if not best_mrna:
            # Gene with no mRNA — skip (rare but possible)
            continue
        minfo = mrna_info[best_mrna]
        exons = mrna_exons.get(best_mrna, [])
        cds = mrna_cds.get(best_mrna, [])
        utr5, cds_parts, utr3 = subtract_cds_from_exons(exons, cds, ginfo["strand"])

        out[gid] = {
            "cultivar": cultivar,
            "chr": ginfo["chr"],
            "start": ginfo["start"],
            "end": ginfo["end"],
            "strand": ginfo["strand"],
            "transcript": {
                "id": best_mrna,
                "utr5": utr5,
                "cds": cds_parts,
                "utr3": utr3,
            },
            "annotation": extract_annotation(minfo["attrs"]),
        }
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--funannotate-dir", type=Path, required=True,
                    help="Root directory containing {cultivar}/annotate_results/{cultivar}.gff3")
    ap.add_argument("--version", type=int, required=True)
    ap.add_argument("--cultivars", nargs="+", default=CULTIVARS,
                    help="Cultivar names (default: 11 Korean panel cultivars)")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--out-dir", type=Path, default=PROJECT_ROOT / "tmp",
                    help="Dry-run output root")
    args = ap.parse_args()
    v = args.version

    # Parse each cultivar
    partitions: dict[str, dict[str, dict]] = defaultdict(dict)
    per_cultivar_counts: dict[str, int] = {}
    overall_start = time.time()

    for cultivar in args.cultivars:
        gff_path = args.funannotate_dir / cultivar / "annotate_results" / f"{cultivar}.gff3"
        if not gff_path.exists():
            print(f"  WARNING: missing {gff_path}, skipping {cultivar}")
            continue
        t0 = time.time()
        genes = parse_cultivar_gff(gff_path, cultivar)
        per_cultivar_counts[cultivar] = len(genes)
        for gid, g in genes.items():
            partitions[prefix_for_gene_id(gid)][gid] = g
        print(f"  {cultivar}: {len(genes)} genes · {time.time() - t0:.1f}s")

    total_genes = sum(per_cultivar_counts.values())
    print(f"\nTotal: {total_genes} genes across {len(per_cultivar_counts)} cultivars · "
          f"{len(partitions)} partitions · {time.time() - overall_start:.1f}s")

    # Build manifest
    manifest = {
        "schemaVersion": 1,
        "orthofinderVersion": v,
        "builtAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "totalGenes": total_genes,
        "cultivars": per_cultivar_counts,
        "partitions": {
            pfx: {
                "path": f"gene_models/v{v}/by_prefix/{pfx}.json",
                "geneCount": len(entries),
            }
            for pfx, entries in sorted(partitions.items())
        },
    }

    # Upload or dump
    def _emit(path: str, body: dict) -> int:
        data = json.dumps(body, separators=(",", ":")).encode("utf-8")
        if args.dry_run:
            out = args.out_dir / path
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_bytes(data)
            return len(data)
        bucket = _lazy_bucket()
        blob = bucket.blob(path)
        blob.upload_from_string(data, content_type="application/json; charset=utf-8")
        blob.cache_control = "public, max-age=3600"
        blob.patch()
        return len(data)

    _bucket_cache = {"b": None}
    def _lazy_bucket():
        if _bucket_cache["b"] is None:
            _bucket_cache["b"] = init_firebase()
        return _bucket_cache["b"]

    total_bytes = 0
    for pfx, entries in sorted(partitions.items()):
        body = {"version": v, "prefix": pfx, "genes": entries}
        total_bytes += _emit(f"gene_models/v{v}/by_prefix/{pfx}.json", body)
    total_bytes += _emit(f"gene_models/v{v}/_manifest.json", manifest)

    mode = f"dry-run ({args.out_dir})" if args.dry_run else "uploaded"
    print(f"{mode}: {len(partitions) + 1} files, "
          f"{total_bytes / 1024 / 1024:.1f} MB total")
    return 0


if __name__ == "__main__":
    sys.exit(main())

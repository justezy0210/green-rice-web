#!/usr/bin/env python3
"""Build gene → SV overlap evidence index for the gene search row badge.

Joins three precomputed artefacts:
  1. Canonical SV events (reference-frame) — `sv_matrix/{release}/events/by_chr/*.json.gz`
     Source of the canonical `svType` for each event.
  2. Per-cultivar sample-frame coordinate side-table —
     `sv_matrix/{release}/per_cultivar_coords/{cultivar}/by_chr/*.json.gz`
     Already gated to SVs the cultivar carries (gt_has_alt).
  3. Gene models (longest-CDS representative transcript) —
     `gene_models/v{N}/by_prefix/*.json`.

For each (cultivar, gene) we classify overlap evidence against the
representative transcript only:

  strong tier — sample-frame SV footprint hits a CDS exon or a canonical
                splice-site (intronic ±2 bp) of any internal intron.
                INS/COMPLEX use `[pos+1, pos + max(refLen,1)]` (dropping
                the VCF left-anchor bp) as the footprint; DEL uses the
                sample-frame breakpoint `pos` with a ±5 bp tolerance
                window (sample frame has no deletion span).

  weak tier   — SV overlaps only UTR / intronic interior / ±2 kb flank,
                i.e. gene context but not coding or canonical splice.

Output (single bundle per release tuple):
  gene_sv_index/v{of}_r{svReleaseId}/index.json  (gzip)

Schema: see `src/types/gene-sv-index.ts`. Compact keys:
  s  1 if strong tier hit
  w  1 if weak-only tier hit (never 1 when s=1)
  n  deduped strong-tier locus count (pos bucketed by 100 bp)
  t  types present in strong tier: subset of 'IDC' (INS / DEL / COMPLEX)
  c  panel carriers in same OG — **always 0 in v1**. Revisit once
     ortholog resolution is wired in (plan: 2026-04-24-gene-sv-overlap-badge.md).

Genes with no overlap at all are omitted.

Usage (dry run locally):
  python3 scripts/build-gene-sv-index.py \\
      --canonical-dir tmp/sv_matrix/sv_v1/events/by_chr \\
      --coord-dir     tmp/sv_matrix/sv_v1/per_cultivar_coords \\
      --gene-models-dir tmp/gene_models/v6/by_prefix \\
      --of-version 6 --sv-release-id sv_v1 --dry-run

Usage (upload to Storage):
  python3 scripts/build-gene-sv-index.py \\
      --canonical-dir tmp/sv_matrix/sv_v1/events/by_chr \\
      --coord-dir     tmp/sv_matrix/sv_v1/per_cultivar_coords \\
      --gene-models-dir tmp/gene_models/v6/by_prefix \\
      --of-version 6 --sv-release-id sv_v1
"""

from __future__ import annotations

import argparse
import gzip
import json
import sys
import time
from bisect import bisect_left, bisect_right
from collections import defaultdict
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BUCKET = "green-rice-db.firebasestorage.app"
SCHEMA_VERSION = 1
FLANK_BP = 2000
DEL_BP_WINDOW = 5      # DEL sample-frame breakpoint tolerance
LOCUS_BUCKET_BP = 100  # strong-tier locus dedup grain


def init_firebase():
    import firebase_admin
    from firebase_admin import credentials, storage

    sa = PROJECT_ROOT / "service-account.json"
    if not sa.exists():
        raise SystemExit("service-account.json missing at repo root.")
    try:
        firebase_admin.get_app()
    except ValueError:
        firebase_admin.initialize_app(
            credentials.Certificate(str(sa)), {"storageBucket": BUCKET}
        )
    return storage.bucket()


def open_maybe_gzip(path: Path):
    with open(path, "rb") as fh:
        magic = fh.read(2)
    return gzip.open(path, "rt") if magic == b"\x1f\x8b" else open(path, "rt")


def load_canonical_types(canonical_dir: Path) -> dict[str, str]:
    """eventId → svType ('INS' | 'DEL' | 'COMPLEX')."""
    print(f"Loading canonical svType from {canonical_dir}…")
    files = sorted(canonical_dir.glob("*.json.gz"))
    if not files:
        raise SystemExit(f"No *.json.gz in {canonical_dir}")
    out: dict[str, str] = {}
    for path in files:
        with open_maybe_gzip(path) as fh:
            bundle = json.load(fh)
        for ev in bundle["events"]:
            out[ev["eventId"]] = ev["svType"]
    print(f"  {len(out):,} events")
    return out


def load_cultivar_coords(
    coord_dir: Path, event_type: dict[str, str]
) -> dict[tuple[str, str], list[dict]]:
    """(cultivar, chr) → sorted-by-pos list of {eventId, pos, refLen, svType}."""
    print(f"Loading per-cultivar coords from {coord_dir}…")
    by_key: dict[tuple[str, str], list[dict]] = defaultdict(list)
    cultivars = sorted(p for p in coord_dir.iterdir() if p.is_dir())
    unknown_event = 0
    for cult_path in cultivars:
        cultivar = cult_path.name
        by_chr_dir = cult_path / "by_chr"
        if not by_chr_dir.exists():
            continue
        for chr_path in sorted(by_chr_dir.glob("*.json.gz")):
            with open_maybe_gzip(chr_path) as fh:
                bundle = json.load(fh)
            chrom = bundle["chr"]
            for e in bundle["entries"]:
                sv_type = event_type.get(e["eventId"])
                if sv_type is None:
                    unknown_event += 1
                    continue
                by_key[(cultivar, chrom)].append({
                    "eventId": e["eventId"],
                    "pos": e["pos"],
                    "refLen": e["refLen"],
                    "svType": sv_type,
                })
    for svs in by_key.values():
        svs.sort(key=lambda s: s["pos"])
    total = sum(len(v) for v in by_key.values())
    print(f"  {total:,} coord rows across {len(by_key)} (cultivar,chr) shards "
          f"(unknown-event drops: {unknown_event})")
    return by_key


def merge_segments(
    segments: list[dict], gap_join: int = 1
) -> list[tuple[int, int]]:
    """Merge (start,end) intervals whose gap is <= `gap_join`. Input
    segments are inclusive `{start, end}`. Adjacent UTR+CDS exon pieces
    have gap=1 (or 0 depending on tool convention); introns have much
    larger gaps."""
    if not segments:
        return []
    sorted_segs = sorted((s["start"], s["end"]) for s in segments)
    merged: list[list[int]] = [list(sorted_segs[0])]
    for s, e in sorted_segs[1:]:
        if s - merged[-1][1] <= gap_join:
            merged[-1][1] = max(merged[-1][1], e)
        else:
            merged.append([s, e])
    return [(s, e) for s, e in merged]


def splice_sites_from_cds(cds: list[dict]) -> list[tuple[int, int]]:
    """±2 bp canonical splice site regions (intronic dinucleotides) at
    every internal CDS intron. Assumes `cds` are CDS exon segments in
    genomic order; returns inclusive [lo, hi] ranges."""
    sorted_cds = sorted((c["start"], c["end"]) for c in cds)
    sites: list[tuple[int, int]] = []
    for i in range(len(sorted_cds) - 1):
        intron_start = sorted_cds[i][1] + 1       # first intronic bp
        intron_end = sorted_cds[i + 1][0] - 1     # last intronic bp
        if intron_end < intron_start:
            continue
        # Donor site (5' end of intron): 2 bp at intron start
        sites.append((intron_start, min(intron_start + 1, intron_end)))
        # Acceptor site (3' end of intron): 2 bp at intron end
        sites.append((max(intron_end - 1, intron_start), intron_end))
    return sites


def interval_overlaps(lo: int, hi: int, ranges: list[tuple[int, int]]) -> bool:
    for rs, re in ranges:
        if not (hi < rs or lo > re):
            return True
    return False


def point_in_ranges(p: int, ranges: list[tuple[int, int]]) -> bool:
    for rs, re in ranges:
        if rs <= p <= re:
            return True
    return False


def classify_gene(
    gene: dict, svs: list[dict]
) -> dict | None:
    """Return a GeneSvEntry dict or None if no overlap."""
    tx = gene["transcript"]
    cds = tx.get("cds", [])
    utr5 = tx.get("utr5", [])
    utr3 = tx.get("utr3", [])
    if not cds and not utr5 and not utr3:
        return None

    cds_ranges = [(c["start"], c["end"]) for c in cds]
    exon_ranges = merge_segments(cds + utr5 + utr3, gap_join=1)
    splice_ranges = splice_sites_from_cds(cds)

    gene_start = gene["start"]
    gene_end = gene["end"]
    flank_lo = max(1, gene_start - FLANK_BP)
    flank_hi = gene_end + FLANK_BP

    positions = [sv["pos"] for sv in svs]
    lo = bisect_left(positions, flank_lo - DEL_BP_WINDOW)
    hi = bisect_right(positions, flank_hi + DEL_BP_WINDOW)
    candidates = svs[lo:hi]
    if not candidates:
        return None

    strong_loci: set[int] = set()
    strong_types: set[str] = set()
    weak_hit = False

    for sv in candidates:
        pos = sv["pos"]
        ref_len = sv.get("refLen", 0) or 0
        sv_type = sv["svType"]

        if sv_type == "DEL":
            # Sample-frame breakpoint. Strong if breakpoint falls
            # inside any CDS exon, or inside the ±2 bp splice site
            # region, or within DEL_BP_WINDOW of either.
            strong = (
                point_in_ranges(pos, cds_ranges)
                or any(
                    rs - DEL_BP_WINDOW <= pos <= re + DEL_BP_WINDOW
                    for rs, re in splice_ranges
                )
            )
            if strong:
                strong_loci.add(pos // LOCUS_BUCKET_BP)
                strong_types.add("D")
                continue
            # Weak: inside gene body (UTR / intron) or in flanking
            if gene_start - DEL_BP_WINDOW <= pos <= gene_end + DEL_BP_WINDOW:
                weak_hit = True
            elif flank_lo <= pos <= flank_hi:
                weak_hit = True
            continue

        # INS / COMPLEX: strip VCF left-anchor, use normalized footprint.
        fp_lo = pos + 1
        fp_hi = pos + max(ref_len, 1)
        if fp_hi < fp_lo:
            continue

        if interval_overlaps(fp_lo, fp_hi, cds_ranges) or interval_overlaps(
            fp_lo, fp_hi, splice_ranges
        ):
            strong_loci.add(pos // LOCUS_BUCKET_BP)
            strong_types.add("I" if sv_type == "INS" else "C")
            continue
        # Weak: overlaps any exon (UTR) or gene body or flank
        if interval_overlaps(fp_lo, fp_hi, exon_ranges):
            weak_hit = True
        elif not (fp_hi < gene_start or fp_lo > gene_end):
            # lands in an intron (gene body minus exon — already known
            # to miss CDS above; UTR/exon-level overlap caught by
            # exon_ranges check)
            weak_hit = True
        elif not (fp_hi < flank_lo or fp_lo > flank_hi):
            weak_hit = True

    if not strong_loci and not weak_hit:
        return None
    s = 1 if strong_loci else 0
    w = 1 if (weak_hit and not strong_loci) else 0
    return {
        "s": s,
        "w": w,
        "n": len(strong_loci) if s else 0,
        "t": "".join(sorted(strong_types)),
        "c": 0,
    }


def iter_gene_partitions(gene_models_dir: Path):
    for path in sorted(gene_models_dir.glob("*.json")):
        with open(path, "rt") as fh:
            partition = json.load(fh)
        yield path.stem, partition


def build_index(
    canonical_dir: Path,
    coord_dir: Path,
    gene_models_dir: Path,
    of_version: int,
    sv_release_id: str,
) -> dict:
    event_type = load_canonical_types(canonical_dir)
    sv_by_key = load_cultivar_coords(coord_dir, event_type)

    print("Scanning gene partitions…")
    gene_entries: dict[str, dict] = {}
    total_genes = 0
    strong_genes = 0
    weak_genes = 0
    t0 = time.time()
    for prefix, partition in iter_gene_partitions(gene_models_dir):
        genes = partition.get("genes", {})
        total_genes += len(genes)
        for gene_id, gene in genes.items():
            cultivar = gene.get("cultivar")
            chrom = gene.get("chr")
            if not cultivar or not chrom:
                continue
            svs = sv_by_key.get((cultivar, chrom))
            if not svs:
                continue
            entry = classify_gene(gene, svs)
            if entry is None:
                continue
            gene_entries[gene_id] = entry
            if entry["s"]:
                strong_genes += 1
            elif entry["w"]:
                weak_genes += 1
    print(f"  scanned {total_genes:,} genes in {time.time() - t0:.1f}s — "
          f"strong={strong_genes:,}, weak-only={weak_genes:,}")

    return {
        "schemaVersion": SCHEMA_VERSION,
        "orthofinderVersion": of_version,
        "svReleaseId": sv_release_id,
        "builtAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "strongGeneCount": strong_genes,
        "weakGeneCount": weak_genes,
        "genes": gene_entries,
    }


def write_index(
    body: dict, of_version: int, sv_release_id: str,
    *, dry_run: bool, out_dir: Path,
):
    raw = json.dumps(body, separators=(",", ":")).encode("utf-8")
    gz = gzip.compress(raw, compresslevel=6)
    dest = f"gene_sv_index/v{of_version}_r{sv_release_id}/index.json"
    if dry_run:
        out = out_dir / dest
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_bytes(raw)
        gz_path = out.with_suffix(".json.gz")
        gz_path.write_bytes(gz)
        print(f"dry-run: wrote {out} (raw {len(raw) / 1024:.1f} KB · "
              f"gz {len(gz) / 1024:.1f} KB at {gz_path.name})")
        return
    bucket = init_firebase()
    blob = bucket.blob(dest)
    blob.content_encoding = "gzip"
    blob.cache_control = "public, max-age=3600"
    blob.upload_from_string(
        gz, content_type="application/json; charset=utf-8"
    )
    print(f"uploaded (gzip): {dest} · raw {len(raw) / 1024:.1f} KB → "
          f"wire {len(gz) / 1024:.1f} KB")


def main() -> int:
    ap = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    ap.add_argument("--canonical-dir", type=Path, required=True,
                    help="sv_matrix/{release}/events/by_chr/")
    ap.add_argument("--coord-dir", type=Path, required=True,
                    help="sv_matrix/{release}/per_cultivar_coords/")
    ap.add_argument("--gene-models-dir", type=Path, required=True,
                    help="gene_models/v{N}/by_prefix/")
    ap.add_argument("--of-version", type=int, required=True)
    ap.add_argument("--sv-release-id", type=str, required=True)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--out-dir", type=Path, default=PROJECT_ROOT / "tmp/promote")
    args = ap.parse_args()

    for d in (args.canonical_dir, args.coord_dir, args.gene_models_dir):
        if not d.exists():
            raise SystemExit(f"missing dir: {d}")

    body = build_index(
        canonical_dir=args.canonical_dir,
        coord_dir=args.coord_dir,
        gene_models_dir=args.gene_models_dir,
        of_version=args.of_version,
        sv_release_id=args.sv_release_id,
    )
    write_index(
        body, args.of_version, args.sv_release_id,
        dry_run=args.dry_run, out_dir=args.out_dir,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())

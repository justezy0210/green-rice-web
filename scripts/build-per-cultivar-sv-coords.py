#!/usr/bin/env python3
"""Build per-cultivar SV coordinate side-tables for sv_matrix/{release}.

Pre-req (server-side, once per release):
  vg gbwt -Z --set-reference <cultivarA> --set-reference <cultivarB> ... \
      --gbz-format -g graph.multiref.gbz graph.gbz
  vg snarls graph.multiref.gbz > graph.snarls
  for s in <cultivars>; do
    vg deconstruct -P $s -r graph.snarls graph.multiref.gbz \
      | bgzip > per_cultivar_vcfs/$s.vcf.gz
  done

This script:
  1. Loads canonical events (tmp/sv_matrix/{release}/events/by_chr/*.json.gz)
     to build originalId → (eventId, gts) lookup.
  2. For each per-cultivar VCF, joins rows by VCF ID to the canonical
     lookup. Canonical is the sole correctness gate — it already
     filtered to top-level LV=0 SV >=50 bp, so a sample row that
     joins is by definition a valid SV we care about. No is_sv
     re-check against ALT0 (which would be wrong for multi-allelic
     snarls where the sample's carrier allele is not ALT0).
  3. Drops events the cultivar does not carry (canonical
     `gts[cultivar]` must be non-zero and non-missing).
  4. Emits sparse per-chr JSON grouped by cultivar:
     sv_matrix/{release}/per_cultivar_coords/{cultivar}/by_chr/{chr}.json.gz

Canonical SvEvent remains reference-frame only; this side-table adds
sample-frame `(pos, refLen)` so Gene-detail SV overlays can render
in the cultivar's own assembly frame (canonical svType + sample
refLen yields biologically correct INS span / DEL breakpoint /
COMPLEX rearrangement span at the rendering layer).

Usage:
  python3 scripts/build-per-cultivar-sv-coords.py \
      --canonical-dir tmp/sv_matrix/sv_v1/events/by_chr \
      --sample-vcf-dir tmp/per_cultivar_vcfs \
      --dry-run
  python3 scripts/build-per-cultivar-sv-coords.py \
      --canonical-dir tmp/sv_matrix/sv_v1/events/by_chr \
      --sample-vcf-dir tmp/per_cultivar_vcfs
"""

from __future__ import annotations

import argparse
import gzip
import json
import sys
import time
from collections import defaultdict
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BUCKET = "green-rice-db.firebasestorage.app"
SV_MIN_LEN_BP = 50
SV_RELEASE_ID_DEFAULT = "sv_v1"
SCHEMA_VERSION = 1


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


def gt_has_alt(gt: str | None) -> bool:
    """Mirror of the TS `gtHasAlt` — true if any sub-allele is a
    non-zero non-missing code."""
    if not gt:
        return False
    for a in gt.replace("|", "/").split("/"):
        if a != "." and a != "0":
            return True
    return False


def resolve_pansn(pansn: str, pos: int) -> tuple[str, int] | None:
    """Extract the bare chromosome name from a PanSN CHROM like
    `baegilmi#0#chr01`. Returns None for unplaced contigs
    (`sample#hap#contig_38` etc).

    `vg deconstruct -P <sample>` outputs merge all of that sample's
    chromosome path fragments into a single CHROM (`sample#hap#chr`)
    with POS expressed in the contiguous chromosome assembly, so we
    only need to strip the PanSN prefix — no per-fragment offset
    arithmetic is required.
    """
    parts = pansn.split("#")
    if len(parts) < 3:
        return None
    chr_name = parts[2]
    if not chr_name.startswith("chr"):
        return None
    return chr_name, pos


def build_canonical_lookup(canonical_dir: Path) -> dict[str, dict]:
    """Build originalId → {eventId, gts} lookup from the canonical
    per-chr event bundles."""
    print(f"Loading canonical events from {canonical_dir}…")
    lookup: dict[str, dict] = {}
    files = sorted(canonical_dir.glob("*.json.gz"))
    if not files:
        raise SystemExit(f"No *.json.gz in {canonical_dir}")
    for path in files:
        # tmp/promote dry-run files can be either true gzip or plain
        # JSON with a `.json.gz` suffix (the production upload gzips
        # server-side; dry-run writes whatever build-sv-matrix handed
        # it). Sniff the magic bytes so both work.
        with open(path, "rb") as bin_fh:
            magic = bin_fh.read(2)
        opener = gzip.open if magic == b"\x1f\x8b" else open
        with opener(path, "rt") as fh:
            bundle = json.load(fh)
        for ev in bundle["events"]:
            lookup[ev["originalId"]] = {
                "eventId": ev["eventId"],
                "gts": ev["gts"],
            }
    print(f"  {len(lookup):,} originalId entries")
    return lookup


def process_sample_vcf(
    vcf_path: Path,
    cultivar: str,
    canonical: dict[str, dict],
) -> dict[str, list[dict]]:
    """Return {chr -> [sparse coord entry, ...]} for the cultivar."""
    by_chr: dict[str, list[dict]] = defaultdict(list)
    dropped_not_in_canonical = 0
    dropped_no_alt_carrier = 0
    dropped_unplaced = 0
    # Canonical join is the sole correctness gate. The canonical
    # matrix already applied `>=50 bp` SV classification + top-level
    # snarl filter upstream, so any sample record whose VCF ID joins
    # a canonical originalId is by definition a top-level SV we
    # care about. We intentionally do NOT re-run an ALT0-based
    # is_sv filter here: the sample VCF emits comma-separated ALTs
    # for multi-allelic snarls, and checking only ALT0 against the
    # sample's REF would drop legitimate carriers whose allele is
    # longer/shorter than ALT0.
    opener = gzip.open if str(vcf_path).endswith(".gz") else open
    with opener(vcf_path, "rt") as fh:
        for line in fh:
            if line.startswith("#"):
                continue
            parts = line.rstrip("\n").split("\t")
            if len(parts) < 8:
                continue
            pansn_chrom = parts[0]
            pos_in_fragment = int(parts[1])
            vid = parts[2]
            ref = parts[3]
            resolved = resolve_pansn(pansn_chrom, pos_in_fragment)
            if resolved is None:
                dropped_unplaced += 1
                continue
            chrom, pos = resolved
            canon = canonical.get(vid)
            if not canon:
                dropped_not_in_canonical += 1
                continue
            gt = canon["gts"].get(cultivar)
            if not gt_has_alt(gt):
                dropped_no_alt_carrier += 1
                continue
            by_chr[chrom].append(
                {
                    "eventId": canon["eventId"],
                    "chr": chrom,
                    "pos": pos,
                    "refLen": len(ref),
                }
            )
    total = sum(len(v) for v in by_chr.values())
    print(
        f"  {cultivar}: {total:,} coord entries across {len(by_chr)} chrs "
        f"(dropped: {dropped_unplaced} unplaced-contig, "
        f"{dropped_not_in_canonical} not-in-canonical, "
        f"{dropped_no_alt_carrier} non-ALT carriers)"
    )
    for chr_events in by_chr.values():
        chr_events.sort(key=lambda e: e["pos"])
    return dict(by_chr)


def write_bundle(
    *,
    bucket,
    dry_run: bool,
    out_dir: Path,
    sv_release_id: str,
    cultivar: str,
    chrom: str,
    entries: list[dict],
) -> None:
    body = {
        "schemaVersion": SCHEMA_VERSION,
        "svReleaseId": sv_release_id,
        "cultivar": cultivar,
        "chr": chrom,
        "count": len(entries),
        "entries": entries,
    }
    raw = json.dumps(body, separators=(",", ":")).encode()
    gz = gzip.compress(raw, compresslevel=6)
    rel = (
        f"sv_matrix/{sv_release_id}/per_cultivar_coords/"
        f"{cultivar}/by_chr/{chrom}.json.gz"
    )
    if dry_run:
        target = out_dir / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(gz)
        return
    blob = bucket.blob(rel)
    blob.content_type = "application/json"
    blob.content_encoding = "gzip"
    blob.upload_from_string(gz, content_type="application/json")
    blob.patch()


def main() -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument(
        "--canonical-dir",
        type=Path,
        required=True,
        help="Directory with tmp/sv_matrix/{release}/events/by_chr/*.json.gz",
    )
    ap.add_argument(
        "--sample-vcf-dir",
        type=Path,
        required=True,
        help="Directory with per-cultivar VCFs named {cultivarId}.vcf[.gz]",
    )
    ap.add_argument("--sv-release-id", type=str, default=SV_RELEASE_ID_DEFAULT)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--out-dir", type=Path, default=PROJECT_ROOT / "tmp/promote")
    ap.add_argument(
        "--cultivar-id-map",
        type=Path,
        default=None,
        help="Optional JSON {vcfFilenameOrStem: cultivarId} when VCF filenames "
             "don't match cultivarId directly.",
    )
    args = ap.parse_args()

    if not args.canonical_dir.exists():
        raise SystemExit(f"canonical-dir missing: {args.canonical_dir}")
    if not args.sample_vcf_dir.exists():
        raise SystemExit(f"sample-vcf-dir missing: {args.sample_vcf_dir}")

    id_map: dict[str, str] = {}
    if args.cultivar_id_map and args.cultivar_id_map.exists():
        id_map = json.loads(args.cultivar_id_map.read_text())

    canonical = build_canonical_lookup(args.canonical_dir)
    bucket = None if args.dry_run else init_firebase()

    vcf_files = sorted(
        p
        for p in args.sample_vcf_dir.iterdir()
        if p.name.endswith(".vcf") or p.name.endswith(".vcf.gz")
    )
    if not vcf_files:
        raise SystemExit(f"No *.vcf / *.vcf.gz in {args.sample_vcf_dir}")
    print(f"Processing {len(vcf_files)} sample VCFs…")

    for vcf in vcf_files:
        stem = vcf.name.removesuffix(".gz").removesuffix(".vcf")
        cultivar = id_map.get(vcf.name, id_map.get(stem, stem))
        t0 = time.time()
        by_chr = process_sample_vcf(vcf, cultivar, canonical)
        for chrom, entries in sorted(by_chr.items()):
            write_bundle(
                bucket=bucket,
                dry_run=args.dry_run,
                out_dir=args.out_dir,
                sv_release_id=args.sv_release_id,
                cultivar=cultivar,
                chrom=chrom,
                entries=entries,
            )
        print(f"  {cultivar} done in {time.time() - t0:.1f}s")

    print(f"All cultivars processed. dry_run={args.dry_run}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Upload per-cultivar genome files (FASTA / gene GFF3 / repeat .out) to
Firebase Storage and update the matching Firestore `genomeSummary`.

Mirrors the web admin panel's upload path so files produced here are
indistinguishable from UI-uploaded ones: same Storage keys, same
Firestore shape, same status transitions.

Storage layout (fixed by src/lib/genome-upload-service.ts):
  genomes/{cultivarId}/genome.fasta
  genomes/{cultivarId}/gene.gff3
  genomes/{cultivarId}/repeat.out

Firestore update:
  cultivars/{cultivarId}.genomeSummary.files.{type} = FileUploadStatus
  cultivars/{cultivarId}.genomeSummary.status = 'pending'
  cultivars/{cultivarId}.genomeSummary.updatedAt = ISO8601

Usage patterns:

  # Batch mode — walk a directory laid out as <root>/<cultivarId>/<file>
  # File matching is by extension:
  #   genome.fasta / *.fasta / *.fa / *.fna  → genomeFasta
  #   gene.gff3    / *.gff3 / *.gff          → geneGff3
  #   repeat.out   / *.out                   → repeatGff
  python scripts/upload-genome-files.py --input /data/cultivars_genomes

  # Per-cultivar explicit paths (any subset allowed):
  python scripts/upload-genome-files.py --cultivar baegilmi \\
      --fasta /data/baegilmi.fa \\
      --gff   /data/baegilmi.gff3 \\
      --repeat /data/baegilmi.out

  # Dry run (no Firebase writes):
  python scripts/upload-genome-files.py --input /data/... --dry-run
"""

from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal, Optional

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "functions-python"))

from shared.manifests import load_cultivars  # noqa: E402

FileType = Literal["genomeFasta", "geneGff3", "repeatGff"]

# Canonical Storage filenames — MUST match src/lib/genome-upload-service.ts.
STORAGE_NAME: dict[FileType, str] = {
    "genomeFasta": "genome.fasta",
    "geneGff3":    "gene.gff3",
    "repeatGff":   "repeat.out",
}

# Extension → type (lowercase, leading dot included). Checked on
# Path.suffix — single-extension match.
EXTENSION_MAP: dict[str, FileType] = {
    ".fasta": "genomeFasta",
    ".fa":    "genomeFasta",
    ".fna":   "genomeFasta",
    ".gff3":  "geneGff3",
    ".out":   "repeatGff",
}

# Compound-suffix matches (checked on the full lowercase filename first).
# `.out.gff` / `.out.gff3` are RepeatMasker's GFF-converted outputs and
# MUST win over the bare-`.gff` → geneGff3 fallback below.
COMPOUND_SUFFIX_MAP: tuple[tuple[str, FileType], ...] = (
    (".out.gff", "repeatGff"),
    (".out.gff3", "repeatGff"),
)

# Bare `.gff` (not `.out.gff`) is treated as gene annotation.
GENE_GFF_EXT = ".gff"


def classify_file(path: Path) -> FileType | None:
    name = path.name.lower()
    for suffix, ftype in COMPOUND_SUFFIX_MAP:
        if name.endswith(suffix):
            return ftype
    ext = path.suffix.lower()
    if ext == GENE_GFF_EXT:
        return "geneGff3"
    return EXTENSION_MAP.get(ext)


def iso_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def valid_cultivar_ids() -> set[str]:
    return {c["id"] for c in load_cultivars()}


# ─────────────────────────────────────────────────────────────
# File discovery
# ─────────────────────────────────────────────────────────────


def discover_batch(root: Path, allowed_ids: set[str]) -> dict[str, dict[FileType, Path]]:
    """Walk `root/<cultivarId>/*` and classify files by extension."""
    out: dict[str, dict[FileType, Path]] = {}
    if not root.is_dir():
        raise SystemExit(f"--input must be a directory: {root}")

    for child in sorted(root.iterdir()):
        if not child.is_dir():
            continue
        cultivar_id = child.name
        if cultivar_id not in allowed_ids:
            print(f"skip {cultivar_id}: not a known cultivar id (from data/cultivars.json)")
            continue

        picks: dict[FileType, Path] = {}
        for f in sorted(child.iterdir()):
            if not f.is_file():
                continue
            ftype = classify_file(f)
            if not ftype:
                continue
            # Prefer canonical filename (genome.fasta) over arbitrary; if two
            # files match the same type, the last one loses — print a warning.
            if ftype in picks:
                print(
                    f"warn: {cultivar_id} has multiple {ftype} candidates; "
                    f"using {picks[ftype].name}, ignoring {f.name}"
                )
                continue
            picks[ftype] = f

        if picks:
            out[cultivar_id] = picks
    return out


# ─────────────────────────────────────────────────────────────
# Firebase upload
# ─────────────────────────────────────────────────────────────


def init_firebase():
    import firebase_admin
    from firebase_admin import credentials, firestore, storage
    sa = PROJECT_ROOT / "service-account.json"
    if not sa.exists():
        raise SystemExit(
            "service-account.json missing at repo root. "
            "Place the admin service account key there (or run with --dry-run)."
        )
    try:
        firebase_admin.get_app()
    except ValueError:
        cred = credentials.Certificate(str(sa))
        firebase_admin.initialize_app(
            cred, {"storageBucket": "green-rice-db.firebasestorage.app"}
        )
    return firestore.client(), storage.bucket()


def upload_one(
    bucket, db, cultivar_id: str, ftype: FileType, local: Path,
    force: bool, dry_run: bool,
) -> None:
    storage_path = f"genomes/{cultivar_id}/{STORAGE_NAME[ftype]}"
    if dry_run:
        print(f"  [DRY] would upload {local} → gs://{storage_path}")
        return

    blob = bucket.blob(storage_path)
    if blob.exists() and not force:
        print(f"  skip {ftype} for {cultivar_id}: already exists (use --force to overwrite)")
        return

    content_type = (
        "text/x-fasta; charset=utf-8" if ftype == "genomeFasta"
        else "text/x-gff3; charset=utf-8" if ftype == "geneGff3"
        else "text/plain; charset=utf-8"
    )
    # upload_from_filename streams in chunks internally — fine for multi-GB.
    blob.upload_from_filename(str(local), content_type=content_type)
    blob.cache_control = "public, max-age=3600"
    # Force save-as rather than inline open. The HTML `download` attribute
    # is ignored for cross-origin URLs, so the server has to declare it.
    blob.content_disposition = f'attachment; filename="{STORAGE_NAME[ftype]}"'
    blob.patch()

    # Firestore update — mirror the web service
    status = {
        "uploaded": True,
        "fileName": local.name,
        "fileSize": local.stat().st_size,
        "uploadedAt": iso_now(),
        "storagePath": storage_path,
    }
    cultivar_ref = db.collection("cultivars").document(cultivar_id)
    cultivar_ref.update({
        f"genomeSummary.files.{ftype}": status,
        "genomeSummary.status": "pending",
        "genomeSummary.updatedAt": iso_now(),
    })
    size_mb = status["fileSize"] / (1024 * 1024)
    print(f"  ✓ {cultivar_id}/{ftype}: {size_mb:.1f} MB → {storage_path}")


# ─────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────


def main() -> int:
    ap = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument("--input", type=Path, help="Batch root directory")
    mode.add_argument("--cultivar", type=str, help="Per-cultivar mode: target cultivar id")

    ap.add_argument("--fasta", type=Path, help="Path to genome FASTA (per-cultivar mode)")
    ap.add_argument("--gff", type=Path, help="Path to gene GFF3 (per-cultivar mode)")
    ap.add_argument("--repeat", type=Path, dest="repeat_path",
                    help="Path to repeat .out (per-cultivar mode)")
    ap.add_argument("--only", choices=list(STORAGE_NAME.keys()),
                    help="Upload only one file type (batch mode).")
    ap.add_argument("--force", action="store_true",
                    help="Overwrite existing Storage files instead of skipping.")
    ap.add_argument("--dry-run", action="store_true",
                    help="Show what would be uploaded; no Firebase writes.")
    args = ap.parse_args()

    allowed = valid_cultivar_ids()

    # Build the upload plan: {cultivar_id: {ftype: local_path}}
    plan: dict[str, dict[FileType, Path]] = {}

    if args.input:
        plan = discover_batch(args.input, allowed)
        if args.only:
            for cid in list(plan.keys()):
                plan[cid] = {k: v for k, v in plan[cid].items() if k == args.only}
                if not plan[cid]:
                    del plan[cid]
    else:
        cid = args.cultivar
        if cid not in allowed:
            raise SystemExit(f"Unknown cultivar id: {cid}. See data/cultivars.json.")
        picks: dict[FileType, Path] = {}
        for flag, ftype in (
            (args.fasta, "genomeFasta"),
            (args.gff, "geneGff3"),
            (args.repeat_path, "repeatGff"),
        ):
            if flag is None:
                continue
            p: Path = flag
            if not p.is_file():
                raise SystemExit(f"File not found: {p}")
            picks[ftype] = p
        if not picks:
            raise SystemExit("Per-cultivar mode requires at least one of --fasta / --gff / --repeat.")
        plan[cid] = picks

    if not plan:
        print("No files to upload.")
        return 0

    # Pre-print the plan
    print(f"\nUpload plan ({'DRY RUN' if args.dry_run else 'LIVE'}):")
    total_files = 0
    total_bytes = 0
    for cid, picks in plan.items():
        print(f"  {cid}:")
        for ftype, p in picks.items():
            size_mb = p.stat().st_size / (1024 * 1024)
            print(f"    {ftype:12s} {p.name}  ({size_mb:.1f} MB)")
            total_files += 1
            total_bytes += p.stat().st_size
    print(f"  -- {total_files} files, {total_bytes / (1024 * 1024):.1f} MB total\n")

    if args.dry_run:
        print("Dry run — no Firebase calls made.")
        return 0

    db, bucket = init_firebase()
    for cid, picks in plan.items():
        print(f"{cid}:")
        for ftype, p in picks.items():
            upload_one(bucket, db, cid, ftype, p, force=args.force, dry_run=False)

    print("\nDone.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

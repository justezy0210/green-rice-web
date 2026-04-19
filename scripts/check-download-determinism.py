#!/usr/bin/env python3
"""Deterministic-rerun check for scripts/generate-download-bundles.py.

Runs the generator twice with the same inputs into two separate temp
staging roots, then diffs every `.tsv` and `.bed` byte-for-byte.
README.md and _manifest.json are skipped because they carry the
generation timestamp + app version; the underlying data files must
still match exactly.

Usage:
  python scripts/check-download-determinism.py

  # Restrict to the dry-run path (no Firebase reads, fast local-only):
  python scripts/check-download-determinism.py --dry-run

Non-zero exit on any TSV/BED byte diff.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
import tempfile
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
GENERATOR = PROJECT_ROOT / "scripts" / "generate-download-bundles.py"
VENV_PY = PROJECT_ROOT / "functions-python" / "venv" / "bin" / "python3"


def run_generator(out_dir: Path, dry_run: bool) -> Path:
    """Run generator into `out_dir`; return the created staging run dir."""
    cmd: list[str] = [str(VENV_PY), str(GENERATOR), "--out-dir", str(out_dir)]
    if dry_run:
        cmd.append("--dry-run")
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        sys.stderr.write(f"generator failed:\n{proc.stderr}\n")
        sys.exit(proc.returncode)
    # Generator writes to out_dir/v{of}_g{g}_{iso}/. Pick the freshest child.
    children = sorted(p for p in out_dir.iterdir() if p.is_dir())
    if not children:
        sys.exit(f"no staging dir produced under {out_dir}")
    return children[-1]


def walk_tsv_bed(root: Path) -> list[Path]:
    return sorted(p for p in root.rglob("*") if p.is_file() and p.suffix in (".tsv", ".bed"))


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry-run", action="store_true",
                    help="Pass --dry-run to the generator (no Firebase reads).")
    args = ap.parse_args()

    with tempfile.TemporaryDirectory(prefix="gr_determ_a_") as tmp_a, \
         tempfile.TemporaryDirectory(prefix="gr_determ_b_") as tmp_b:
        dir_a = Path(tmp_a)
        dir_b = Path(tmp_b)

        print("[run A]")
        run_a = run_generator(dir_a, args.dry_run)
        print(f"  → {run_a}")
        print("[run B]")
        run_b = run_generator(dir_b, args.dry_run)
        print(f"  → {run_b}")

        files_a = walk_tsv_bed(run_a)
        rel_keys = [f.relative_to(run_a).as_posix() for f in files_a]

        diffs: list[str] = []
        missing_in_b: list[str] = []
        for rel in rel_keys:
            pa = run_a / rel
            pb = run_b / rel
            if not pb.is_file():
                missing_in_b.append(rel)
                continue
            if pa.read_bytes() != pb.read_bytes():
                diffs.append(rel)

        files_b = walk_tsv_bed(run_b)
        extra_in_b = [
            f.relative_to(run_b).as_posix() for f in files_b
            if f.relative_to(run_b).as_posix() not in set(rel_keys)
        ]

        if diffs or missing_in_b or extra_in_b:
            print("\n✗ Determinism check failed")
            for rel in diffs:
                print(f"  bytes differ: {rel}")
            for rel in missing_in_b:
                print(f"  missing in run B: {rel}")
            for rel in extra_in_b:
                print(f"  extra in run B: {rel}")
            return 1

        print(f"\n✓ Deterministic: {len(rel_keys)} TSV/BED files byte-identical across two runs")
        return 0


if __name__ == "__main__":
    sys.exit(main())

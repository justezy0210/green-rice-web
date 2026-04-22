#!/usr/bin/env python3
"""Extract block-level candidate/intersection bundles from a raw analysis run.

Each block spec is formatted as:

  name|trait1,trait2,...|chrom|start|end

Example:

  python3 scripts/extract-curated-blocks.py /path/to/full_run \\
    --block heading_chr06|heading_date|chr06|9000000|11000000

Provenance: pulled from the analysis server on 2026-04-22. Default block
set is the three curated regions from the 2026-04-22 run
(`curated_blocks/*`), documented in
`docs/generated/followup-block-summary-2026-04-22.md`.
"""

from __future__ import annotations

import argparse
import csv
from pathlib import Path


DEFAULT_BLOCKS = (
    "heading_shared_chr06|heading_date,culm_length|chr06|9000000|11000000",
    "shared_chr11_dev_block|heading_date,culm_length,spikelets_per_panicle|chr11|21000000|25000000",
    "blb_chr11_resistance_block|bacterial_leaf_blight|chr11|27000000|29000000",
)


def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("run_dir", type=Path)
    ap.add_argument(
        "--block",
        action="append",
        default=[],
        help="Block spec: name|trait1,trait2|chrom|start|end",
    )
    return ap.parse_args()


def parse_block_spec(spec: str) -> dict[str, object]:
    parts = spec.split("|")
    if len(parts) != 5:
        raise ValueError(f"Invalid block spec: {spec}")
    name, traits_csv, chrom, start, end = parts
    return {
        "name": name,
        "traits": [trait.strip() for trait in traits_csv.split(",") if trait.strip()],
        "chrom": chrom,
        "start": int(start),
        "end": int(end),
    }


def read_tsv(path: Path) -> list[dict[str, str]]:
    with path.open() as handle:
        reader = csv.DictReader(handle, delimiter="\t")
        return list(reader)


def overlaps(start_a: int, end_a: int, start_b: int, end_b: int) -> bool:
    return not (end_a < start_b or end_b < start_a)


def write_tsv(path: Path, rows: list[dict[str, str]], fieldnames: list[str]) -> None:
    with path.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, delimiter="\t", extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def main() -> int:
    args = parse_args()
    run_dir = args.run_dir
    blocks = args.block or list(DEFAULT_BLOCKS)
    parsed_blocks = [parse_block_spec(spec) for spec in blocks]
    out_root = run_dir / "curated_blocks"
    out_root.mkdir(parents=True, exist_ok=True)

    for block in parsed_blocks:
        name = str(block["name"])
        traits = list(block["traits"])
        chrom = str(block["chrom"])
        start = int(block["start"])
        end = int(block["end"])
        block_dir = out_root / name
        block_dir.mkdir(parents=True, exist_ok=True)

        candidate_rows: list[dict[str, str]] = []
        intersection_rows: list[dict[str, str]] = []

        for trait in traits:
            step5_path = run_dir / "step5_candidates" / f"{trait}.tsv"
            step4_path = run_dir / "step4_intersections" / f"{trait}.tsv"

            if step5_path.exists():
                for row in read_tsv(step5_path):
                    if row.get("best_chrom") != chrom or not row.get("best_start"):
                        continue
                    row_start = int(row["best_start"])
                    row_end = int(row["best_end"] or row["best_start"])
                    if overlaps(row_start, row_end, start, end):
                        candidate_rows.append({"trait": trait, **row})

            if step4_path.exists():
                for row in read_tsv(step4_path):
                    if row.get("chrom") != chrom:
                        continue
                    row_start = int(row["start"])
                    row_end = int(row["end"])
                    if overlaps(row_start, row_end, start, end):
                        intersection_rows.append({"trait": trait, **row})

        candidate_rows.sort(
            key=lambda row: (
                row["trait"],
                -float(row.get("combined_score") or 0.0),
                float(row.get("p_value") or 1.0),
                row["orthogroup"],
            )
        )
        intersection_rows.sort(
            key=lambda row: (
                row["trait"],
                -float(row.get("score") or 0.0),
                row["orthogroup"],
                row["event_id"],
            )
        )

        if candidate_rows:
            write_tsv(
                block_dir / "candidates.tsv",
                candidate_rows,
                fieldnames=list(candidate_rows[0].keys()),
            )
        if intersection_rows:
            write_tsv(
                block_dir / "intersections.tsv",
                intersection_rows,
                fieldnames=list(intersection_rows[0].keys()),
            )

        unique_ogs = sorted({row["orthogroup"] for row in candidate_rows})
        unique_events = sorted({row["event_id"] for row in intersection_rows})
        summary_lines = [
            f"# {name}",
            "",
            f"- Traits: {', '.join(traits)}",
            f"- Region: {chrom}:{start}-{end}",
            f"- Candidate rows: {len(candidate_rows)}",
            f"- Unique OGs: {len(unique_ogs)}",
            f"- Intersection rows: {len(intersection_rows)}",
            f"- Unique SV events: {len(unique_events)}",
            "",
            "## Top Candidate Rows",
        ]

        if not candidate_rows:
            summary_lines.append("- none")
        else:
            for row in candidate_rows[:10]:
                summary_lines.append(
                    f"- {row['trait']} · {row['orthogroup']} · {row['candidate_type']} · "
                    f"score {row['combined_score']} · SV {row.get('best_sv_id') or 'none'}"
                )

        summary_lines.extend(["", "## Top Intersection Rows"])
        if not intersection_rows:
            summary_lines.append("- none")
        else:
            for row in intersection_rows[:10]:
                summary_lines.append(
                    f"- {row['trait']} · {row['orthogroup']} · {row['event_id']} · "
                    f"{row['impact_class']} · gap {row['gap']}"
                )

        (block_dir / "summary.md").write_text("\n".join(summary_lines) + "\n")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

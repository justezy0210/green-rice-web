#!/usr/bin/env python3
"""Summarize hotspot blocks from a raw 5-step analysis run.

Reads `step5_candidates/*.tsv` from a completed `run-raw-analysis.py`
output directory and writes:

  - followup_block_summary.tsv
  - followup_shared_ogs.tsv
  - followup_block_report.md

Default focus traits:
  - heading_date
  - culm_length
  - spikelets_per_panicle
  - bacterial_leaf_blight

Provenance: pulled from the analysis server on 2026-04-22. Server output
mirrored into `docs/generated/followup-block-summary-2026-04-22.md`.
"""

from __future__ import annotations

import argparse
import csv
from collections import Counter, defaultdict
from pathlib import Path

DEFAULT_TRAITS = (
    "heading_date",
    "culm_length",
    "spikelets_per_panicle",
    "bacterial_leaf_blight",
)


def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("run_dir", type=Path, help="Completed raw analysis output directory")
    ap.add_argument(
        "--traits",
        default=",".join(DEFAULT_TRAITS),
        help="Comma-separated trait IDs to summarize",
    )
    ap.add_argument(
        "--top-n",
        type=int,
        default=50,
        help="Use the top N candidates per trait",
    )
    ap.add_argument(
        "--bin-bp",
        type=int,
        default=1_000_000,
        help="Genomic bin size for hotspot summarization",
    )
    return ap.parse_args()


def read_top_candidates(path: Path, top_n: int) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    with path.open() as handle:
        reader = csv.DictReader(handle, delimiter="\t")
        for i, row in enumerate(reader):
            if i >= top_n:
                break
            rows.append(row)
    return rows


def bucket_label(start: int, bin_bp: int) -> tuple[int, int]:
    bin_start = (start // bin_bp) * bin_bp
    return bin_start, bin_start + bin_bp - 1


def nonempty(value: str | None) -> bool:
    return bool(value and value.strip())


def main() -> int:
    args = parse_args()
    run_dir = args.run_dir
    traits = [trait.strip() for trait in args.traits.split(",") if trait.strip()]
    step5_dir = run_dir / "step5_candidates"
    block_rows: list[dict[str, str | int]] = []
    shared_og_rows: list[dict[str, str | int]] = []
    og_to_traits: dict[str, set[str]] = defaultdict(set)
    og_to_details: dict[str, list[tuple[str, str, str, str, str]]] = defaultdict(list)
    block_to_traits: dict[tuple[str, int], set[str]] = defaultdict(set)

    per_trait_reports: list[str] = []

    for trait in traits:
        path = step5_dir / f"{trait}.tsv"
        if not path.exists():
            continue
        rows = read_top_candidates(path, args.top_n)
        block_groups: dict[tuple[str, int], list[dict[str, str]]] = defaultdict(list)
        for row in rows:
            if not nonempty(row.get("best_chrom")) or not nonempty(row.get("best_start")):
                continue
            chrom = row["best_chrom"]
            start = int(row["best_start"])
            block_key = (chrom, (start // args.bin_bp) * args.bin_bp)
            block_groups[block_key].append(row)
            block_to_traits[block_key].add(trait)
            og_to_traits[row["orthogroup"]].add(trait)
            og_to_details[row["orthogroup"]].append(
                (
                    trait,
                    row.get("candidate_type", ""),
                    row.get("best_sv_id", ""),
                    row.get("best_chrom", ""),
                    row.get("best_start", ""),
                )
            )

        ranked_blocks = sorted(
            block_groups.items(),
            key=lambda item: (-len(item[1]), item[0][0], item[0][1]),
        )
        per_trait_reports.append(f"## {trait}")
        if not ranked_blocks:
            per_trait_reports.append("- no blockable candidates in the selected top set")
            per_trait_reports.append("")
            continue

        for (chrom, bin_start), block_rows_for_trait in ranked_blocks[:5]:
            bin_a, bin_b = bucket_label(bin_start, args.bin_bp)
            candidate_types = Counter(row["candidate_type"] for row in block_rows_for_trait)
            sv_ids = Counter(
                row["best_sv_id"]
                for row in block_rows_for_trait
                if nonempty(row.get("best_sv_id"))
            )
            ogs = [row["orthogroup"] for row in block_rows_for_trait]
            func_ogs = [
                f"{row['orthogroup']} ({row['function_summary']})"
                for row in block_rows_for_trait
                if nonempty(row.get("function_summary"))
            ][:5]
            block_rows.append(
                {
                    "trait": trait,
                    "chrom": chrom,
                    "bin_start": bin_a,
                    "bin_end": bin_b,
                    "candidate_count": len(block_rows_for_trait),
                    "candidate_types": ",".join(
                        f"{name}:{count}" for name, count in sorted(candidate_types.items())
                    ),
                    "top_svs": ",".join(
                        f"{sv}:{count}" for sv, count in sv_ids.most_common(5)
                    ),
                    "top_ogs": ",".join(ogs[:10]),
                    "annotated_ogs": " | ".join(func_ogs),
                }
            )
            per_trait_reports.append(
                f"- {chrom}:{bin_a}-{bin_b} · {len(block_rows_for_trait)} of top {args.top_n} candidates"
            )
            if sv_ids:
                per_trait_reports.append(
                    f"  repeated SVs: {', '.join(f'{sv}×{count}' for sv, count in sv_ids.most_common(3))}"
                )
            if func_ogs:
                per_trait_reports.append(
                    f"  annotated OGs: {'; '.join(func_ogs[:3])}"
                )
        per_trait_reports.append("")

    for og, traits_for_og in sorted(
        og_to_traits.items(),
        key=lambda item: (-len(item[1]), item[0]),
    ):
        if len(traits_for_og) < 2:
            continue
        detail_bits = []
        for trait, candidate_type, sv_id, chrom, start in sorted(og_to_details[og]):
            detail_bits.append(f"{trait}:{candidate_type}:{sv_id}:{chrom}:{start}")
        shared_og_rows.append(
            {
                "orthogroup": og,
                "trait_count": len(traits_for_og),
                "traits": ",".join(sorted(traits_for_og)),
                "details": " | ".join(detail_bits),
            }
        )

    with (run_dir / "followup_block_summary.tsv").open("w", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "trait",
                "chrom",
                "bin_start",
                "bin_end",
                "candidate_count",
                "candidate_types",
                "top_svs",
                "top_ogs",
                "annotated_ogs",
            ],
            delimiter="\t",
        )
        writer.writeheader()
        writer.writerows(block_rows)

    with (run_dir / "followup_shared_ogs.tsv").open("w", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["orthogroup", "trait_count", "traits", "details"],
            delimiter="\t",
        )
        writer.writeheader()
        writer.writerows(shared_og_rows)

    shared_blocks = [
        (chrom, bin_start, sorted(traits_for_block))
        for (chrom, bin_start), traits_for_block in block_to_traits.items()
        if len(traits_for_block) >= 2
    ]
    shared_blocks.sort(key=lambda item: (-len(item[2]), item[0], item[1]))

    report_lines = [
        "# Follow-up Block Summary",
        "",
        f"Run directory: `{run_dir}`",
        f"Traits: `{', '.join(traits)}`",
        f"Top candidates per trait: `{args.top_n}`",
        f"Block bin size: `{args.bin_bp}` bp",
        "",
        "## Shared Blocks Across Traits",
    ]
    if not shared_blocks:
        report_lines.append("- none")
    else:
        for chrom, bin_start, block_traits in shared_blocks[:15]:
            bin_a, bin_b = bucket_label(bin_start, args.bin_bp)
            report_lines.append(
                f"- {chrom}:{bin_a}-{bin_b} · {len(block_traits)} traits · {', '.join(block_traits)}"
            )
    report_lines.append("")
    report_lines.extend(per_trait_reports)

    (run_dir / "followup_block_report.md").write_text("\n".join(report_lines) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

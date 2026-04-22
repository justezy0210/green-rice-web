#!/usr/bin/env python3
"""Run the 5-step candidate-discovery workflow from raw server files.

This script is intentionally self-contained so it can be copied to the
remote analysis host and executed inside the `analysis` conda environment
that already has `pysam`, `numpy`, and `scipy`.

Provenance: pulled from the analysis server on 2026-04-22. The authoritative
artifacts it produced currently live at
`/10Gdata/.../results/analysis/raw_workflow_20260422/full_run` and are
summarised in `docs/generated/raw-analysis-2026-04-22.md`.

Companion scripts:
  - `scripts/summarize-analysis-blocks.py`: block-level followup summary
    from this script's step5 TSVs.
  - `scripts/extract-curated-blocks.py`: carve out region bundles for
    manual review.

The Firestore/Storage promotion (`analysis_runs/*`, `intersection_releases/*`,
etc.) is NOT performed here — that lives in a separate Phase A promote
script so the analysis stays independent of Firebase credentials.

Outputs (on disk):
  - step1_groupings.json
  - step2_orthogroups/{trait}.json|tsv
  - step3_sv_top/{trait}.tsv
  - step4_intersections/{trait}.tsv
  - step5_candidates/{trait}.json|tsv
  - report.md
"""

from __future__ import annotations

import argparse
import csv
import json
import math
from collections import defaultdict
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from heapq import heappush, heapreplace
from pathlib import Path
from typing import Any
from urllib.parse import unquote

import numpy as np
import pysam
from scipy import stats

P_STRICT = 0.05
P_RELAXED = 0.10
MIN_EFFECT = 0.5
FALLBACK_MIN_HITS = 5
FALLBACK_TOP_N = 10
PROMOTER_BP_DEFAULT = 2000
SV_MIN_LEN_BP = 50
GROUP_SPECIFICITY_MAX = 20.0
FUNCTION_MAX = 1.0
OG_PATTERN_MAX = 1.0
WEIGHT_GROUP_SPECIFICITY = 0.5
WEIGHT_FUNCTION = 0.25
WEIGHT_OG_PATTERN = 0.25
TOP_SV_EVENTS_PER_TRAIT = 100
TOP_SV_HITS_PER_OG = 8


@dataclass
class DiffEntry:
    orthogroup: str
    groupLabels: list[str]
    meansByGroup: dict[str, float]
    presenceByGroup: dict[str, float]
    cultivarCountsByGroup: dict[str, int]
    meanDiff: float
    presenceDiff: float
    log2FoldChange: float | None
    cliffsDelta: float | None
    uStatistic: float
    pValue: float
    qValue: float
    representative: dict[str, Any] | None


@dataclass
class ScoredCandidate:
    traitId: str
    orthogroup: str
    baseRank: int
    baseScore: float
    combinedScore: float
    candidateType: str
    functionSummary: str | None
    groupSpecificitySummary: str
    orthogroupPatternSummary: str
    bestSvId: str | None
    bestSvType: str | None
    bestSvGap: float | None
    bestImpactClass: str | None
    bestCultivar: str | None
    bestGeneId: str | None
    bestChrom: str | None
    bestStart: int | None
    bestEnd: int | None
    meansByGroup: dict[str, float]
    presenceByGroup: dict[str, float]
    pValue: float
    qValue: float
    meanDiff: float
    log2FoldChange: float | None
    representative: dict[str, Any] | None


def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--groupings",
        type=Path,
        default=Path("data/analysis_groupings_v4.json"),
    )
    ap.add_argument(
        "--gene-count-tsv",
        type=Path,
        default=Path(
            "/10Gdata/ezy/02_Ongoing_Projects/00_Main/Green_Rice/results/orthofinder/output_with_irgsp/Results_Apr15/Orthogroups/Orthogroups.GeneCount.tsv"
        ),
    )
    ap.add_argument(
        "--og-members-tsv",
        type=Path,
        default=Path(
            "/10Gdata/ezy/02_Ongoing_Projects/00_Main/Green_Rice/results/orthofinder/output_with_irgsp/Results_Apr15/Orthogroups/Orthogroups_with_description.tsv"
        ),
    )
    ap.add_argument(
        "--gff-dir",
        type=Path,
        default=Path(
            "/10Gdata/ezy/02_Ongoing_Projects/00_Main/Green_Rice/results/funannotate_v2/primary"
        ),
    )
    ap.add_argument(
        "--vcf",
        type=Path,
        default=Path(
            "/10Gdata/ezy/02_Ongoing_Projects/00_Main/Green_Rice/results/cactus/gr-pg/green-rice-pg.vcf.gz"
        ),
    )
    ap.add_argument(
        "--output",
        type=Path,
        default=Path("/tmp/green_rice_raw_analysis"),
    )
    ap.add_argument(
        "--promoter-bp",
        type=int,
        default=PROMOTER_BP_DEFAULT,
    )
    ap.add_argument(
        "--traits",
        type=str,
        default="",
        help="Comma-separated trait IDs. Default: all traits in the grouping file.",
    )
    return ap.parse_args()


def load_groupings(path: Path) -> dict[str, dict]:
    data = json.loads(path.read_text())
    return data["traits"]


def parse_gene_count_tsv(path: Path) -> tuple[list[str], dict[str, dict[str, int]]]:
    with path.open() as handle:
        reader = csv.reader(handle, delimiter="\t")
        header = next(reader)
        cultivar_ids: list[str] = []
        col_indices: list[int] = []
        for idx, col in enumerate(header[1:], start=1):
            if col in {"IRGSP-1.0", "Total"}:
                continue
            cultivar_ids.append(strip_longest_suffix(col))
            col_indices.append(idx)

        matrix: dict[str, dict[str, int]] = {}
        for row in reader:
            if not row:
                continue
            og_id = row[0]
            matrix[og_id] = {}
            for col_idx, cultivar_id in zip(col_indices, cultivar_ids):
                try:
                    matrix[og_id][cultivar_id] = int(row[col_idx])
                except (IndexError, ValueError):
                    matrix[og_id][cultivar_id] = 0
    return cultivar_ids, matrix


def strip_longest_suffix(value: str) -> str:
    return value[:-8] if value.endswith("_longest") else value


def strip_transcript_suffix(gene_id: str) -> str:
    if ".t" in gene_id:
        return gene_id.rsplit(".t", 1)[0]
    return gene_id


def parse_irgsp_descriptions(cell: str) -> dict[str, str]:
    descriptions: dict[str, str] = {}
    if not cell:
        return descriptions
    for chunk in cell.split(";"):
        chunk = chunk.strip()
        if not chunk or ":" not in chunk:
            continue
        tid, desc = chunk.split(":", 1)
        tid = unquote(tid.strip())
        desc = unquote(desc.strip())
        if tid:
            descriptions[tid] = desc
    return descriptions


def load_og_descriptions(path: Path) -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    with path.open() as handle:
        reader = csv.reader(handle, delimiter="\t")
        header = next(reader)
        irgsp_idx = header.index("IRGSP-1.0")
        desc_idx = header.index("IRGSP_description")
        for row in reader:
            if not row:
                continue
            og_id = row[0]
            transcripts = []
            if irgsp_idx < len(row) and row[irgsp_idx].strip():
                transcripts = [x.strip() for x in row[irgsp_idx].split(",") if x.strip()]
            descriptions = {}
            if desc_idx < len(row):
                descriptions = parse_irgsp_descriptions(row[desc_idx])
            out[og_id] = {
                "transcripts": transcripts,
                "descriptions": descriptions,
            }
    return out


def load_selected_og_members(path: Path, selected_ogs: set[str]) -> dict[str, dict[str, list[str]]]:
    members: dict[str, dict[str, list[str]]] = {}
    with path.open() as handle:
        reader = csv.reader(handle, delimiter="\t")
        header = next(reader)
        cultivar_cols: list[tuple[int, str]] = []
        for idx, col in enumerate(header):
            if col.endswith("_longest"):
                cultivar_cols.append((idx, strip_longest_suffix(col)))

        for row in reader:
            if not row:
                continue
            og_id = row[0]
            if og_id not in selected_ogs:
                continue
            per_cultivar: dict[str, list[str]] = {}
            for col_idx, cultivar_id in cultivar_cols:
                if col_idx >= len(row):
                    continue
                cell = row[col_idx].strip()
                if not cell:
                    continue
                genes = [g.strip() for g in cell.split(",") if g.strip()]
                if genes:
                    per_cultivar[cultivar_id] = genes
            members[og_id] = per_cultivar
    return members


def build_count_matrices(
    og_ids: list[str],
    matrix: dict[str, dict[str, int]],
    g1_members: list[str],
    g2_members: list[str],
) -> tuple[np.ndarray, np.ndarray, list[str]]:
    g1_rows: list[list[float]] = []
    g2_rows: list[list[float]] = []
    valid_ogs: list[str] = []
    for og_id in og_ids:
        cell = matrix.get(og_id, {})
        try:
            g1_row = [int(cell.get(cid, 0) or 0) for cid in g1_members]
            g2_row = [int(cell.get(cid, 0) or 0) for cid in g2_members]
        except (TypeError, ValueError):
            continue
        g1_rows.append(g1_row)
        g2_rows.append(g2_row)
        valid_ogs.append(og_id)
    return np.asarray(g1_rows, dtype=float), np.asarray(g2_rows, dtype=float), valid_ogs


def bh_correction(p_values: list[float]) -> list[float]:
    n = len(p_values)
    if n == 0:
        return []
    indexed = sorted(enumerate(p_values), key=lambda x: x[1])
    out = [0.0] * n
    running = 1.0
    for rank, (idx, p_value) in enumerate(reversed(indexed), start=1):
        i = n - rank + 1
        adjusted = min(running, p_value * n / i)
        running = adjusted
        out[idx] = min(1.0, adjusted)
    return out


def select_candidates(candidates: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], str, dict[str, float], int]:
    def passes(candidate: dict[str, Any], p_cutoff: float) -> bool:
        return candidate["p_value"] < p_cutoff and candidate["mean_diff"] >= MIN_EFFECT

    strict = [candidate for candidate in candidates if passes(candidate, P_STRICT)]
    if len(strict) >= FALLBACK_MIN_HITS:
        strict.sort(key=lambda c: (c["p_value"], -c["mean_diff"]))
        return strict, "strict", {"pValue": P_STRICT, "meanDiff": MIN_EFFECT}, len(strict)

    relaxed = [candidate for candidate in candidates if passes(candidate, P_RELAXED)]
    if len(relaxed) >= FALLBACK_MIN_HITS:
        relaxed.sort(key=lambda c: (c["p_value"], -c["mean_diff"]))
        return relaxed, "relaxed", {"pValue": P_RELAXED, "meanDiff": MIN_EFFECT}, len(relaxed)

    fallback = sorted(candidates, key=lambda c: (c["p_value"], -c["mean_diff"]))[:FALLBACK_TOP_N]
    return fallback, "top_n_fallback", {"pValue": P_RELAXED, "meanDiff": MIN_EFFECT}, len(relaxed)


def compute_diff_for_trait(
    trait_id: str,
    grouping_doc: dict[str, Any],
    matrix: dict[str, dict[str, int]],
    og_descriptions: dict[str, dict[str, Any]],
) -> tuple[dict[str, Any], list[DiffEntry]]:
    assignments = grouping_doc["assignments"]
    group_members: dict[str, list[str]] = {}
    for cultivar_id, payload in assignments.items():
        if payload.get("borderline"):
            continue
        label = payload.get("groupLabel")
        if label:
            group_members.setdefault(label, []).append(cultivar_id)

    group_labels = grouping_doc["groupLabels"]
    if len(group_labels) != 2:
        raise ValueError(f"{trait_id} must have exactly two group labels")
    g1, g2 = group_labels
    g1_members = sorted(group_members.get(g1, []))
    g2_members = sorted(group_members.get(g2, []))
    og_ids = list(matrix.keys())
    g1_mat, g2_mat, valid_ogs = build_count_matrices(og_ids, matrix, g1_members, g2_members)
    if len(valid_ogs) == 0:
        raise ValueError(f"{trait_id}: no valid orthogroups after matrix coercion")

    means_g1 = g1_mat.mean(axis=1)
    means_g2 = g2_mat.mean(axis=1)
    presence_g1 = (g1_mat >= 1).mean(axis=1)
    presence_g2 = (g2_mat >= 1).mean(axis=1)
    mean_diffs = np.abs(means_g1 - means_g2)
    presence_diffs = np.abs(presence_g1 - presence_g2)

    with np.errstate(divide="ignore", invalid="ignore"):
        log2_fcs = np.where(
            (means_g1 > 0) & (means_g2 > 0),
            np.log2(means_g2 / means_g1),
            np.nan,
        )

    mwu = stats.mannwhitneyu(g1_mat, g2_mat, alternative="two-sided", axis=1, method="asymptotic")
    u_stats = np.asarray(mwu.statistic, dtype=float)
    p_values = np.asarray(mwu.pvalue, dtype=float)
    valid_mask = ~np.isnan(p_values)
    valid_idx = np.where(valid_mask)[0]
    q_values = np.array(bh_correction(p_values[valid_mask].tolist()))
    n1 = len(g1_members)
    n2 = len(g2_members)
    cliffs_delta = (2.0 * u_stats / (n1 * n2)) - 1.0

    candidates: list[dict[str, Any]] = []
    for local_rank, idx in enumerate(valid_idx):
        og_id = valid_ogs[idx]
        log2_fc = float(log2_fcs[idx]) if not np.isnan(log2_fcs[idx]) else None
        cliff = float(cliffs_delta[idx]) if not np.isnan(cliffs_delta[idx]) else None
        candidates.append(
            {
                "og_id": og_id,
                "means": {g1: float(means_g1[idx]), g2: float(means_g2[idx])},
                "presence": {g1: float(presence_g1[idx]), g2: float(presence_g2[idx])},
                "cult_counts": {g1: n1, g2: n2},
                "mean_diff": float(mean_diffs[idx]),
                "presence_diff": float(presence_diffs[idx]),
                "log2_fc": log2_fc,
                "cliffs_delta": cliff,
                "u_stat": float(u_stats[idx]),
                "p_value": float(p_values[idx]),
                "q_value": float(q_values[local_rank]),
                "representative": og_descriptions.get(og_id),
            }
        )

    selected, selection_mode, thresholds, passed_count = select_candidates(candidates)
    entries: list[DiffEntry] = []
    for candidate in selected:
        entries.append(
            DiffEntry(
                orthogroup=candidate["og_id"],
                groupLabels=group_labels,
                meansByGroup=candidate["means"],
                presenceByGroup=candidate["presence"],
                cultivarCountsByGroup=candidate["cult_counts"],
                meanDiff=candidate["mean_diff"],
                presenceDiff=candidate["presence_diff"],
                log2FoldChange=candidate["log2_fc"],
                cliffsDelta=candidate["cliffs_delta"],
                uStatistic=candidate["u_stat"],
                pValue=candidate["p_value"],
                qValue=candidate["q_value"],
                representative=candidate["representative"],
            )
        )

    meta = {
        "traitId": trait_id,
        "label": grouping_doc["label"],
        "method": grouping_doc["method"],
        "groupLabels": group_labels,
        "selectionMode": selection_mode,
        "thresholds": thresholds,
        "totalTested": int(valid_mask.sum()),
        "passedCount": passed_count,
        "entryCount": len(entries),
        "groupCounts": {g1: len(g1_members), g2: len(g2_members)},
        "note": grouping_doc.get("note"),
    }
    return meta, entries


def score_base_candidate(entry: DiffEntry) -> tuple[float, str | None, str, str]:
    p_value = entry.pValue
    lfc = entry.log2FoldChange
    abs_lfc = abs(lfc) if lfc is not None else 0.0
    minus_log10_p = -math.log10(p_value) if p_value > 0 else 0.0
    group_specificity_raw = minus_log10_p * (1.0 + abs_lfc)
    norm_gs = min(group_specificity_raw, GROUP_SPECIFICITY_MAX) / GROUP_SPECIFICITY_MAX

    descriptions = ((entry.representative or {}).get("descriptions") or {})
    real_descriptions = [value for value in descriptions.values() if value and value != "NA"]
    function_score = 1.0 if real_descriptions else 0.0
    norm_fn = function_score / FUNCTION_MAX

    presence_values = list(entry.presenceByGroup.values())
    presence_gap = max(presence_values) - min(presence_values) if presence_values else 0.0
    norm_og = max(0.0, min(1.0, presence_gap)) / OG_PATTERN_MAX

    total = (
        WEIGHT_GROUP_SPECIFICITY * norm_gs
        + WEIGHT_FUNCTION * norm_fn
        + WEIGHT_OG_PATTERN * norm_og
    )

    primary_description = real_descriptions[0] if real_descriptions else None
    p_fmt = f"{p_value:.1e}" if p_value < 1e-4 else f"{p_value:.3f}"
    summary_bits = [f"Δmean {entry.meanDiff:.2f}"]
    if lfc is not None:
        summary_bits.append(f"log2FC {lfc:.2f}")
    summary_bits.append(f"p {p_fmt}")
    gs_summary = " · ".join(summary_bits)
    og_summary = " vs ".join(
        f"{label}: {entry.presenceByGroup.get(label, 0.0) * 100:.0f}% present"
        for label in entry.groupLabels
    )
    return total, primary_description, gs_summary, og_summary


def parse_gff_gene_index(path: Path) -> dict[str, dict[str, Any]]:
    genes: dict[str, dict[str, Any]] = {}
    with path.open() as handle:
        for line in handle:
            if line.startswith("#"):
                continue
            cols = line.rstrip().split("\t")
            if len(cols) < 9 or cols[2] != "gene":
                continue
            attrs: dict[str, str] = {}
            for pair in cols[8].split(";"):
                if "=" not in pair:
                    continue
                key, value = pair.split("=", 1)
                attrs[key.strip()] = unquote(value.strip())
            gene_id = attrs.get("ID")
            if gene_id:
                genes[gene_id] = {
                    "chr": cols[0],
                    "start": int(cols[3]),
                    "end": int(cols[4]),
                    "strand": cols[6],
                }
    return genes


def build_gene_coord_index(gff_dir: Path, cultivars: list[str]) -> dict[str, dict[str, dict[str, Any]]]:
    out: dict[str, dict[str, dict[str, Any]]] = {}
    for cultivar in cultivars:
        gff_path = gff_dir / f"{cultivar}_longest.gff3"
        out[cultivar] = parse_gff_gene_index(gff_path)
    return out


def classify_event(record: pysam.VariantRecord) -> tuple[str, int] | None:
    ref = record.ref or ""
    alt = record.alts[0] if record.alts else ""
    ref_len = len(ref)
    alt_len = len(alt)
    diff = alt_len - ref_len
    if abs(diff) < SV_MIN_LEN_BP and (ref_len < SV_MIN_LEN_BP or alt_len < SV_MIN_LEN_BP):
        return None
    if diff >= SV_MIN_LEN_BP:
        return "INS", diff
    if -diff >= SV_MIN_LEN_BP:
        return "DEL", diff
    if ref_len >= SV_MIN_LEN_BP and alt_len >= SV_MIN_LEN_BP:
        return "COMPLEX", diff
    return None


def top_level_lv(record: pysam.VariantRecord) -> bool:
    lv = record.info.get("LV")
    if lv is None:
        return False
    if isinstance(lv, tuple):
        if not lv:
            return False
        return int(lv[0]) == 0
    return int(lv) == 0


def allele_frequency(
    genotype_tuples: list[tuple[int | None, ...] | None],
    sample_indices: list[int],
) -> dict[str, float | int]:
    alt = 0
    total = 0
    for idx in sample_indices:
        gt = genotype_tuples[idx]
        if gt is None:
            continue
        for allele in gt:
            if allele is None:
                continue
            total += 1
            if allele != 0:
                alt += 1
    freq = (alt / total) if total else 0.0
    return {"alt": alt, "total": total, "freq": round(freq, 4)}


def push_top(heap: list[tuple[float, int, dict[str, Any]]], score: float, counter: int, payload: dict[str, Any], limit: int) -> None:
    item = (score, counter, payload)
    if len(heap) < limit:
        heappush(heap, item)
        return
    if score > heap[0][0]:
        heapreplace(heap, item)


def tsv_write(path: Path, rows: list[dict[str, Any]], fieldnames: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, delimiter="\t", extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def json_write(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n")


def main() -> int:
    args = parse_args()
    output_dir = args.output
    output_dir.mkdir(parents=True, exist_ok=True)

    generated_at = datetime.now(timezone.utc).isoformat()
    groupings = load_groupings(args.groupings)
    if args.traits:
        wanted = {trait.strip() for trait in args.traits.split(",") if trait.strip()}
        groupings = {trait_id: groupings[trait_id] for trait_id in sorted(wanted) if trait_id in groupings}
    cultivar_ids, matrix = parse_gene_count_tsv(args.gene_count_tsv)
    og_descriptions = load_og_descriptions(args.og_members_tsv)

    step2_meta: dict[str, dict[str, Any]] = {}
    step2_entries: dict[str, list[DiffEntry]] = {}
    selected_ogs_by_trait: dict[str, list[str]] = {}
    selected_ogs_union: set[str] = set()

    for trait_id in sorted(groupings.keys()):
        meta, entries = compute_diff_for_trait(trait_id, groupings[trait_id], matrix, og_descriptions)
        step2_meta[trait_id] = meta
        step2_entries[trait_id] = entries
        selected_ogs_by_trait[trait_id] = [entry.orthogroup for entry in entries]
        selected_ogs_union.update(selected_ogs_by_trait[trait_id])

        entry_rows = [asdict(entry) for entry in entries]
        json_write(output_dir / "step2_orthogroups" / f"{trait_id}.json", {"meta": meta, "entries": entry_rows})
        tsv_write(
            output_dir / "step2_orthogroups" / f"{trait_id}.tsv",
            [
                {
                    "orthogroup": entry.orthogroup,
                    "group_labels": ",".join(entry.groupLabels),
                    "means_by_group": json.dumps(entry.meansByGroup, sort_keys=True),
                    "presence_by_group": json.dumps(entry.presenceByGroup, sort_keys=True),
                    "mean_diff": round(entry.meanDiff, 4),
                    "presence_diff": round(entry.presenceDiff, 4),
                    "log2_fc": None if entry.log2FoldChange is None else round(entry.log2FoldChange, 4),
                    "cliffs_delta": None if entry.cliffsDelta is None else round(entry.cliffsDelta, 4),
                    "u_statistic": round(entry.uStatistic, 4),
                    "p_value": entry.pValue,
                    "q_value": entry.qValue,
                    "primary_description": first_real_description(entry.representative),
                }
                for entry in entries
            ],
            [
                "orthogroup",
                "group_labels",
                "means_by_group",
                "presence_by_group",
                "mean_diff",
                "presence_diff",
                "log2_fc",
                "cliffs_delta",
                "u_statistic",
                "p_value",
                "q_value",
                "primary_description",
            ],
        )

    gene_coords = build_gene_coord_index(args.gff_dir, cultivar_ids)
    og_members = load_selected_og_members(args.og_members_tsv, selected_ogs_union)

    intervals_by_chrom: dict[str, list[dict[str, Any]]] = defaultdict(list)
    og_gene_rows: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for trait_id, og_ids in selected_ogs_by_trait.items():
        for og_id in og_ids:
            for cultivar_id, gene_ids in og_members.get(og_id, {}).items():
                coord_index = gene_coords.get(cultivar_id, {})
                for gene_id in gene_ids:
                    bare = strip_transcript_suffix(gene_id)
                    coord = coord_index.get(bare)
                    if coord is None:
                        continue
                    gene_row = {
                        "traitId": trait_id,
                        "orthogroup": og_id,
                        "cultivar": cultivar_id,
                        "geneId": gene_id,
                        "chrom": coord["chr"],
                        "start": coord["start"],
                        "end": coord["end"],
                        "strand": coord["strand"],
                    }
                    og_gene_rows[(trait_id, og_id)].append(gene_row)
                    intervals_by_chrom[coord["chr"]].append(
                        {
                            **gene_row,
                            "intervalStart": coord["start"],
                            "intervalEnd": coord["end"],
                            "impactClass": "gene_body",
                            "impactPriority": 2,
                        }
                    )
                    if coord["strand"] == "-":
                        promoter_start = coord["end"] + 1
                        promoter_end = coord["end"] + args.promoter_bp
                    else:
                        promoter_start = max(1, coord["start"] - args.promoter_bp)
                        promoter_end = coord["start"] - 1
                    if promoter_end >= promoter_start:
                        intervals_by_chrom[coord["chr"]].append(
                            {
                                **gene_row,
                                "intervalStart": promoter_start,
                                "intervalEnd": promoter_end,
                                "impactClass": "promoter",
                                "impactPriority": 1,
                            }
                        )

    for chrom in intervals_by_chrom:
        intervals_by_chrom[chrom].sort(key=lambda x: (x["intervalStart"], x["intervalEnd"]))

    trait_group_indices: dict[str, dict[str, list[int]]] = {}
    for trait_id, grouping_doc in groupings.items():
        sample_indices_by_label: dict[str, list[int]] = defaultdict(list)
        for idx, cultivar_id in enumerate(cultivar_ids):
            payload = grouping_doc["assignments"].get(cultivar_id)
            if not payload or payload.get("borderline"):
                continue
            label = payload["groupLabel"]
            sample_indices_by_label[label].append(idx)
        trait_group_indices[trait_id] = dict(sample_indices_by_label)

    vcf = pysam.VariantFile(str(args.vcf))
    vcf_samples = list(vcf.header.samples)
    if vcf_samples != cultivar_ids:
        raise ValueError(f"VCF samples do not match cultivar IDs: {vcf_samples} != {cultivar_ids}")

    top_sv_heaps: dict[str, list[tuple[float, int, dict[str, Any]]]] = defaultdict(list)
    support_heaps: dict[tuple[str, str], list[tuple[float, int, dict[str, Any]]]] = defaultdict(list)
    sv_type_counts: dict[str, int] = defaultdict(int)
    total_sv_events = 0
    current_chrom = None
    interval_cursor = 0
    active_intervals: list[dict[str, Any]] = []
    event_counter = 0
    push_sequence = 0

    for record in vcf.fetch():
        if not top_level_lv(record):
            continue
        classified = classify_event(record)
        if classified is None:
            continue
        sv_type, _ = classified
        event_counter += 1
        total_sv_events += 1
        sv_type_counts[sv_type] += 1

        chrom = record.contig
        start = record.pos
        end = record.stop
        event_id = f"EV{event_counter:07d}"

        if chrom != current_chrom:
            current_chrom = chrom
            interval_cursor = 0
            active_intervals = []
        chrom_intervals = intervals_by_chrom.get(chrom, [])
        while interval_cursor < len(chrom_intervals) and chrom_intervals[interval_cursor]["intervalStart"] <= end:
            active_intervals.append(chrom_intervals[interval_cursor])
            interval_cursor += 1
        active_intervals = [interval for interval in active_intervals if interval["intervalEnd"] >= start]

        genotype_tuples = [record.samples[sample].get("GT") for sample in vcf_samples]
        trait_freqs: dict[str, dict[str, Any]] = {}
        for trait_id, group_idx in trait_group_indices.items():
            labels = groupings[trait_id]["groupLabels"]
            if len(labels) != 2:
                continue
            low_label, high_label = labels
            low_stats = allele_frequency(genotype_tuples, group_idx.get(low_label, []))
            high_stats = allele_frequency(genotype_tuples, group_idx.get(high_label, []))
            gap = abs(float(low_stats["freq"]) - float(high_stats["freq"]))
            trait_freqs[trait_id] = {
                low_label: low_stats,
                high_label: high_stats,
                "gap": round(gap, 4),
            }
            top_payload = {
                "eventId": event_id,
                "svType": sv_type,
                "chrom": chrom,
                "start": start,
                "end": end,
                "freqs": {
                    low_label: low_stats,
                    high_label: high_stats,
                },
                "gap": round(gap, 4),
            }
            push_sequence += 1
            push_top(top_sv_heaps[trait_id], gap, push_sequence, top_payload, TOP_SV_EVENTS_PER_TRAIT)

        local_hits: dict[tuple[str, str, str, str], dict[str, Any]] = {}
        for interval in active_intervals:
            key = (interval["traitId"], interval["orthogroup"], interval["cultivar"], interval["geneId"])
            previous = local_hits.get(key)
            if previous is None or interval["impactPriority"] > previous["impactPriority"]:
                local_hits[key] = interval

        for (trait_id, og_id, cultivar_id, gene_id), interval in local_hits.items():
            freq_payload = trait_freqs[trait_id]
            gap = float(freq_payload["gap"])
            if gap <= 0:
                continue
            impact_weight = 1.0 if interval["impactClass"] == "gene_body" else 0.8
            hit_score = gap * impact_weight
            hit_payload = {
                "eventId": event_id,
                "svType": sv_type,
                "chrom": chrom,
                "start": start,
                "end": end,
                "impactClass": interval["impactClass"],
                "score": round(hit_score, 4),
                "gap": round(gap, 4),
                "cultivar": cultivar_id,
                "geneId": gene_id,
                "groupFreqs": {
                    label: stats_payload
                    for label, stats_payload in freq_payload.items()
                    if label != "gap"
                },
            }
            push_sequence += 1
            push_top(support_heaps[(trait_id, og_id)], hit_score, push_sequence, hit_payload, TOP_SV_HITS_PER_OG)

    step4_rows: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for (trait_id, og_id), heap in support_heaps.items():
        for score, _, payload in sorted(heap, key=lambda item: (-item[0], item[2]["eventId"])):
            row = {
                "orthogroup": og_id,
                "event_id": payload["eventId"],
                "sv_type": payload["svType"],
                "impact_class": payload["impactClass"],
                "score": payload["score"],
                "gap": payload["gap"],
                "chrom": payload["chrom"],
                "start": payload["start"],
                "end": payload["end"],
                "cultivar": payload["cultivar"],
                "gene_id": payload["geneId"],
                "group_freqs": json.dumps(payload["groupFreqs"], sort_keys=True),
            }
            step4_rows[trait_id].append(row)

    for trait_id in sorted(groupings.keys()):
        trait_top_events = [item[2] for item in sorted(top_sv_heaps[trait_id], key=lambda x: (-x[0], x[2]["eventId"]))]
        tsv_write(
            output_dir / "step3_sv_top" / f"{trait_id}.tsv",
            [
                {
                    "event_id": row["eventId"],
                    "sv_type": row["svType"],
                    "chrom": row["chrom"],
                    "start": row["start"],
                    "end": row["end"],
                    "gap": row["gap"],
                    "group_freqs": json.dumps(row["freqs"], sort_keys=True),
                }
                for row in trait_top_events
            ],
            ["event_id", "sv_type", "chrom", "start", "end", "gap", "group_freqs"],
        )
        tsv_write(
            output_dir / "step4_intersections" / f"{trait_id}.tsv",
            sorted(step4_rows.get(trait_id, []), key=lambda row: (-row["score"], row["orthogroup"], row["event_id"])),
            [
                "orthogroup",
                "event_id",
                "sv_type",
                "impact_class",
                "score",
                "gap",
                "chrom",
                "start",
                "end",
                "cultivar",
                "gene_id",
                "group_freqs",
            ],
        )

    step5_candidates: dict[str, list[ScoredCandidate]] = {}
    for trait_id, entries in step2_entries.items():
        candidates: list[ScoredCandidate] = []
        scored_entries: list[tuple[float, str | None, str, str, DiffEntry]] = []
        for entry in entries:
            base_total, function_summary, gs_summary, og_summary = score_base_candidate(entry)
            scored_entries.append((base_total, function_summary, gs_summary, og_summary, entry))
        scored_entries.sort(key=lambda item: item[0], reverse=True)

        for rank, (_, function_summary, gs_summary, og_summary, entry) in enumerate(scored_entries, start=1):
            support_heap = support_heaps.get((trait_id, entry.orthogroup), [])
            support_rows = [payload for _, _, payload in sorted(support_heap, key=lambda item: (-item[0], item[2]["eventId"]))]
            best_hit = support_rows[0] if support_rows else None
            presence_values = list(entry.presenceByGroup.values())
            presence_gap = max(presence_values) - min(presence_values) if presence_values else 0.0

            candidate_type = "og_only"
            sv_bonus = 0.0
            if best_hit:
                impact_weight = 1.0 if best_hit["impactClass"] == "gene_body" else 0.8
                sv_bonus = min(0.25, best_hit["gap"] * impact_weight * 0.25)
                if best_hit["impactClass"] == "promoter" and min(presence_values) >= 0.8 and presence_gap < 0.25:
                    candidate_type = "sv_regulatory"
                elif (entry.log2FoldChange is not None and abs(entry.log2FoldChange) >= 1.0 and entry.meanDiff >= 1.0):
                    candidate_type = "cnv_dosage"
                else:
                    candidate_type = "og_plus_sv"

            combined_score = round(min(1.25, base_total + sv_bonus), 6)
            candidates.append(
                ScoredCandidate(
                    traitId=trait_id,
                    orthogroup=entry.orthogroup,
                    baseRank=rank,
                    baseScore=round(scored_entries[rank - 1][0], 6),
                    combinedScore=combined_score,
                    candidateType=candidate_type,
                    functionSummary=function_summary,
                    groupSpecificitySummary=gs_summary,
                    orthogroupPatternSummary=og_summary,
                    bestSvId=best_hit["eventId"] if best_hit else None,
                    bestSvType=best_hit["svType"] if best_hit else None,
                    bestSvGap=best_hit["gap"] if best_hit else None,
                    bestImpactClass=best_hit["impactClass"] if best_hit else None,
                    bestCultivar=best_hit["cultivar"] if best_hit else None,
                    bestGeneId=best_hit["geneId"] if best_hit else None,
                    bestChrom=best_hit["chrom"] if best_hit else None,
                    bestStart=best_hit["start"] if best_hit else None,
                    bestEnd=best_hit["end"] if best_hit else None,
                    meansByGroup=entry.meansByGroup,
                    presenceByGroup=entry.presenceByGroup,
                    pValue=entry.pValue,
                    qValue=entry.qValue,
                    meanDiff=entry.meanDiff,
                    log2FoldChange=entry.log2FoldChange,
                    representative=entry.representative,
                )
            )

        candidates.sort(key=lambda candidate: (-candidate.combinedScore, candidate.pValue, -candidate.meanDiff, candidate.orthogroup))
        step5_candidates[trait_id] = candidates
        json_write(
            output_dir / "step5_candidates" / f"{trait_id}.json",
            {
                "meta": step2_meta[trait_id],
                "candidates": [asdict(candidate) for candidate in candidates],
            },
        )
        tsv_write(
            output_dir / "step5_candidates" / f"{trait_id}.tsv",
            [
                {
                    "orthogroup": candidate.orthogroup,
                    "candidate_type": candidate.candidateType,
                    "base_rank": candidate.baseRank,
                    "base_score": candidate.baseScore,
                    "combined_score": candidate.combinedScore,
                    "p_value": candidate.pValue,
                    "q_value": candidate.qValue,
                    "mean_diff": candidate.meanDiff,
                    "log2_fc": candidate.log2FoldChange,
                    "means_by_group": json.dumps(candidate.meansByGroup, sort_keys=True),
                    "presence_by_group": json.dumps(candidate.presenceByGroup, sort_keys=True),
                    "function_summary": candidate.functionSummary,
                    "best_sv_id": candidate.bestSvId,
                    "best_sv_type": candidate.bestSvType,
                    "best_sv_gap": candidate.bestSvGap,
                    "best_impact_class": candidate.bestImpactClass,
                    "best_cultivar": candidate.bestCultivar,
                    "best_gene_id": candidate.bestGeneId,
                    "best_chrom": candidate.bestChrom,
                    "best_start": candidate.bestStart,
                    "best_end": candidate.bestEnd,
                    "group_specificity_summary": candidate.groupSpecificitySummary,
                    "orthogroup_pattern_summary": candidate.orthogroupPatternSummary,
                }
                for candidate in candidates
            ],
            [
                "orthogroup",
                "candidate_type",
                "base_rank",
                "base_score",
                "combined_score",
                "p_value",
                "q_value",
                "mean_diff",
                "log2_fc",
                "means_by_group",
                "presence_by_group",
                "function_summary",
                "best_sv_id",
                "best_sv_type",
                "best_sv_gap",
                "best_impact_class",
                "best_cultivar",
                "best_gene_id",
                "best_chrom",
                "best_start",
                "best_end",
                "group_specificity_summary",
                "orthogroup_pattern_summary",
            ],
        )

    json_write(
        output_dir / "step1_groupings.json",
        {
            "generatedAt": generated_at,
            "groupings": groupings,
        },
    )

    summary = {
        "generatedAt": generated_at,
        "inputs": {
            "groupings": str(args.groupings),
            "geneCountTsv": str(args.gene_count_tsv),
            "ogMembersTsv": str(args.og_members_tsv),
            "gffDir": str(args.gff_dir),
            "vcf": str(args.vcf),
        },
        "policy": {
            "promoterBp": args.promoter_bp,
            "svFilter": "LV=0 and SV-like by REF/ALT length (>=50 bp)",
            "candidateLanguage": "candidate / proposed grouping / discovery only",
        },
        "step2": step2_meta,
        "step3": {
            "totalSvEvents": total_sv_events,
            "svTypeCounts": dict(sorted(sv_type_counts.items())),
        },
    }
    json_write(output_dir / "summary.json", summary)

    report_lines = [
        "# Raw 5-Step Analysis",
        "",
        f"Generated: `{generated_at}`",
        "",
        "## Inputs",
        f"- Groupings: `{args.groupings}`",
        f"- Gene counts: `{args.gene_count_tsv}`",
        f"- OG members: `{args.og_members_tsv}`",
        f"- GFF3 directory: `{args.gff_dir}`",
        f"- VCF: `{args.vcf}`",
        "",
        "## Policy",
        f"- Promoter window: `{args.promoter_bp} bp`",
        "- SV filter: `LV=0` and `|len(REF)-len(ALT0)| >= 50 bp` or long-complex records",
        "- Result framing: `candidate` / `proposed grouping` / discovery only",
        "- Not attempted in this run: genome-wide synteny blocks, explicit inversion caller, QTL integration, expression validation",
        "",
        "## Global SV Scan",
        f"- Total SV-like events scanned: `{total_sv_events}`",
        f"- Type counts: `{json.dumps(dict(sorted(sv_type_counts.items())), sort_keys=True)}`",
        "",
    ]

    for trait_id in sorted(groupings.keys()):
        meta = step2_meta[trait_id]
        candidates = step5_candidates[trait_id]
        top_candidates = candidates[:5]
        top_events = [item[2] for item in sorted(top_sv_heaps[trait_id], key=lambda x: (-x[0], x[2]["eventId"]))[:5]]
        report_lines.extend(
            [
                f"## {meta['label']} `{trait_id}`",
                f"- Method: `{meta['method']}`",
                f"- Group labels: `{', '.join(meta['groupLabels'])}`",
                f"- Group counts used: `{json.dumps(meta['groupCounts'], sort_keys=True)}`",
                f"- Step 2 selection: `{meta['selectionMode']}` · selected `{meta['entryCount']}` OGs from `{meta['totalTested']}` tested",
                f"- Note: {meta.get('note') or 'none'}",
                "",
                "Top combined candidates:",
            ]
        )
        if not top_candidates:
            report_lines.append("- none")
        for candidate in top_candidates:
            sv_clause = ""
            if candidate.bestSvId:
                sv_clause = (
                    f"; best SV {candidate.bestSvId} ({candidate.bestSvType}, "
                    f"{candidate.bestImpactClass}, gap {candidate.bestSvGap})"
                )
            report_lines.append(
                f"- {candidate.orthogroup} · {candidate.candidateType} · "
                f"combined {candidate.combinedScore:.3f} · {candidate.groupSpecificitySummary}{sv_clause}"
            )
        report_lines.append("")
        report_lines.append("Top SV events by group-frequency gap:")
        if not top_events:
            report_lines.append("- none")
        for event in top_events:
            report_lines.append(
                f"- {event['eventId']} · {event['svType']} · {event['chrom']}:{event['start']}-{event['end']} · gap {event['gap']}"
            )
        report_lines.append("")

    (output_dir / "report.md").write_text("\n".join(report_lines) + "\n")
    return 0


def first_real_description(representative: dict[str, Any] | None) -> str | None:
    if not representative:
        return None
    for value in (representative.get("descriptions") or {}).values():
        if value and value != "NA":
            return value
    return None


if __name__ == "__main__":
    raise SystemExit(main())

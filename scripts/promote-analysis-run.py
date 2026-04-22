#!/usr/bin/env python3
"""Promote server 5-step analysis artifacts (`run-raw-analysis.py` output
directory) to Firestore + Firebase Storage.

Inputs (produced on the analysis server):

  {run_dir}/
    step5_candidates/{trait}.tsv     ← extended candidate rows with best_sv_*
    step4_intersections/{trait}.tsv  ← OG × SV overlap rows with impact_class
    followup_block_summary.tsv       ← 1 Mb bin aggregation per trait
    followup_shared_ogs.tsv          ← (optional) OG recurrence across traits
    curated_blocks/{blockName}/candidates.tsv
    curated_blocks/{blockName}/intersections.tsv
    curated_blocks/{blockName}/summary.md

Outputs (Firestore):

  analysis_runs/{runId}                         header + topBlockIds + blockCount
  analysis_runs/{runId}/candidates/{ogId}       candidate with bestSv + blockId
  analysis_runs/{runId}/blocks/{blockId}        CandidateBlock doc (auto + curated)
  intersection_releases/{intersectionReleaseId} header
  entity_analysis_index/og_{ogId}               topBlocks field merged in

Outputs (Storage, gzip):

  analysis_runs/{runId}/step4_intersections.json.gz
  og_sv_intersections/{intRelId}/by_og/{ogId}.json.gz
  analysis_runs/{runId}/blocks/{blockId}.json.gz  (export bundle, on-demand)

Fails fast on:
  - missing/extra columns in step4 / step5 TSV vs expected schema
  - unknown candidate_type / impact_class / sv_type value
  - JSON parse failure on means_by_group / presence_by_group / group_freqs
  - curated block whose `Region:` line cannot be parsed

Usage:
  python3 scripts/promote-analysis-run.py --run-dir <path-to-full_run> --dry-run
  python3 scripts/promote-analysis-run.py --run-dir <path-to-full_run>
"""

from __future__ import annotations

import argparse
import csv
import gzip
import json
import re
import sys
import time
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parent.parent

# ── Config ─────────────────────────────────────────────────────────────────
SV_VERSION_DEFAULT = 1
SCORING_VERSION_DEFAULT = 1
GENE_MODEL_VERSION_DEFAULT = 11
GROUPING_VERSION_DEFAULT = 4
ORTHOFINDER_VERSION_DEFAULT = 6
BLOCK_SET_VERSION_DEFAULT = 1
INTERSECTION_RELEASE_ID_DEFAULT = "int_v1"
SV_RELEASE_ID_DEFAULT = "sv_v1"
BUCKET = "green-rice-db.firebasestorage.app"
SCHEMA_VERSION = 1
BLOCK_BIN_BP = 1_000_000
BLOCK_NEAR_BOUNDARY_BP = 100_000

# ── Enumerated validators (mirror TS unions) ───────────────────────────────
_CANDIDATE_TYPES = {
    "og_only", "og_plus_sv", "sv_regulatory", "cnv_dosage", "haplotype_block"
}
_IMPACT_CLASSES = {
    "gene_body", "cds_disruption", "promoter", "upstream",
    "cluster_enclosure", "cnv_support", "inversion_boundary", "te_associated",
}
_SV_TYPES = {"INS", "DEL", "COMPLEX"}
_BLOCK_TYPES = {"og_sv_block", "sv_regulatory_block", "cnv_block", "shared_linked_block"}

# ── Expected TSV columns ───────────────────────────────────────────────────
_STEP5_COLUMNS = (
    "orthogroup", "candidate_type", "base_rank", "base_score", "combined_score",
    "p_value", "q_value", "mean_diff", "log2_fc", "means_by_group",
    "presence_by_group", "function_summary", "best_sv_id", "best_sv_type",
    "best_sv_gap", "best_impact_class", "best_cultivar", "best_gene_id",
    "best_chrom", "best_start", "best_end",
    "group_specificity_summary", "orthogroup_pattern_summary",
)
_STEP4_COLUMNS = (
    "orthogroup", "event_id", "sv_type", "impact_class", "score", "gap",
    "chrom", "start", "end", "cultivar", "gene_id", "group_freqs",
)
_BLOCK_SUMMARY_COLUMNS = (
    "trait", "chrom", "bin_start", "bin_end", "candidate_count",
    "candidate_types", "top_svs", "top_ogs", "annotated_ogs",
)


# ── Firebase bootstrap (deferred to main) ──────────────────────────────────

def init_firebase():
    import firebase_admin
    from firebase_admin import credentials, firestore, storage
    sa = PROJECT_ROOT / "service-account.json"
    if not sa.exists():
        raise SystemExit("service-account.json missing at repo root.")
    try:
        firebase_admin.get_app()
    except ValueError:
        firebase_admin.initialize_app(
            credentials.Certificate(str(sa)), {"storageBucket": BUCKET}
        )
    return firestore.client(), storage.bucket()


# ── runId encoding (mirror src/lib/analysis-run-id.ts) ─────────────────────

def encode_run_id(trait_id: str, g: int, of: int, sv: int, gm: int, sc: int) -> str:
    return f"{trait_id}_g{g}_of{of}_sv{sv}_gm{gm}_sc{sc}"


# ── TSV helpers ────────────────────────────────────────────────────────────

def _read_tsv(path: Path, expected_cols: tuple[str, ...]) -> list[dict[str, str]]:
    with path.open(encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh, delimiter="\t")
        if tuple(reader.fieldnames or ()) != expected_cols:
            raise SystemExit(
                f"{path}: column mismatch.\n  expected: {expected_cols}\n  got:      {reader.fieldnames}"
            )
        return list(reader)


def _as_float_or_none(value: str) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except ValueError as exc:
        raise SystemExit(f"expected float, got {value!r}: {exc}")


def _as_int_or_none(value: str) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(value)
    except ValueError as exc:
        raise SystemExit(f"expected int, got {value!r}: {exc}")


def _as_str_or_none(value: str) -> str | None:
    if value is None or value == "":
        return None
    return value


def _parse_json_map(value: str, field: str, trait_id: str) -> dict[str, Any]:
    if not value:
        return {}
    try:
        obj = json.loads(value)
    except json.JSONDecodeError as exc:
        raise SystemExit(f"{trait_id}: malformed JSON in {field!r}: {value[:80]}… ({exc})")
    if not isinstance(obj, dict):
        raise SystemExit(f"{trait_id}: expected object in {field!r}, got {type(obj).__name__}")
    return obj


# ── Step 5 → candidate doc ─────────────────────────────────────────────────

@dataclass
class PromotedCandidate:
    doc: dict[str, Any]
    chrom: str | None
    start: int | None
    end: int | None


def _build_candidate_doc(
    row: dict[str, str], trait_id: str, run_id: str, now_iso: str
) -> PromotedCandidate:
    og = row["orthogroup"]
    ctype = row["candidate_type"]
    if ctype not in _CANDIDATE_TYPES:
        raise SystemExit(f"{trait_id}:{og} unknown candidate_type {ctype!r}")

    best_sv_id = _as_str_or_none(row["best_sv_id"])
    best_sv_type = _as_str_or_none(row["best_sv_type"])
    best_impact = _as_str_or_none(row["best_impact_class"])
    chrom = _as_str_or_none(row["best_chrom"])
    start = _as_int_or_none(row["best_start"])
    end = _as_int_or_none(row["best_end"])

    if best_sv_type is not None and best_sv_type not in _SV_TYPES:
        raise SystemExit(f"{trait_id}:{og} unknown best_sv_type {best_sv_type!r}")
    if best_impact is not None and best_impact not in _IMPACT_CLASSES:
        raise SystemExit(f"{trait_id}:{og} unknown best_impact_class {best_impact!r}")

    best_sv: dict[str, Any] | None = None
    if best_sv_id and chrom and start is not None and end is not None and best_sv_type:
        best_sv = {
            "eventId": best_sv_id,
            "svType": best_sv_type,
            "chr": chrom,
            "start": start,
            "end": end,
            "impactClass": best_impact,
            "cultivar": _as_str_or_none(row["best_cultivar"]),
            "geneId": _as_str_or_none(row["best_gene_id"]),
            "absDeltaAf": _as_float_or_none(row["best_sv_gap"]),
        }

    means_by_group = _parse_json_map(row["means_by_group"], "means_by_group", trait_id)
    presence_by_group = _parse_json_map(row["presence_by_group"], "presence_by_group", trait_id)

    base_rank = _as_int_or_none(row["base_rank"])
    base_score = _as_float_or_none(row["base_score"])
    combined_score = _as_float_or_none(row["combined_score"])
    mean_diff = _as_float_or_none(row["mean_diff"])
    log2fc = _as_float_or_none(row["log2_fc"])
    p_value = _as_float_or_none(row["p_value"])
    q_value = _as_float_or_none(row["q_value"])

    doc = {
        "candidateId": og,
        "runId": run_id,
        "traitId": trait_id,
        "candidateType": ctype,
        "primaryOgId": og,
        "leadGeneId": best_sv["geneId"] if best_sv else None,
        "leadRegion": None,
        "leadSvId": best_sv["eventId"] if best_sv else None,
        "bestSv": best_sv,
        "blockId": None,  # filled later in assign_block_ids
        "rank": 0,        # populated post-sort by combinedScore
        "baseRank": base_rank,
        "baseScore": base_score,
        "combinedScore": combined_score,
        "totalScore": combined_score if combined_score is not None else 0.0,
        "scoreBreakdown": [],  # defer to Phase A2+ scoreboard mapping
        "groupSpecificitySummary": _as_str_or_none(row["group_specificity_summary"]),
        "functionSummary": _as_str_or_none(row["function_summary"]),
        "orthogroupPatternSummary": _as_str_or_none(row["orthogroup_pattern_summary"]),
        "svImpactSummary": None,
        "syntenySummary": None,
        "expressionSummary": None,
        "qtlSummary": None,
        "badges": [],
        "storageBundlePath": None,
        "createdAt": now_iso,
        "meansByGroup": means_by_group,
        "presenceByGroup": presence_by_group,
        "meanDiff": mean_diff,
        "log2FoldChange": log2fc,
        "pValue": p_value,
        "qValue": q_value,
    }
    return PromotedCandidate(doc=doc, chrom=chrom, start=start, end=end)


# ── Step 4 → intersection rows ─────────────────────────────────────────────

def _build_intersection_row(row: dict[str, str], trait_id: str) -> dict[str, Any]:
    impact = row["impact_class"]
    if impact not in _IMPACT_CLASSES:
        raise SystemExit(f"{trait_id}: unknown impact_class {impact!r}")
    sv_type = row["sv_type"]
    if sv_type not in _SV_TYPES:
        raise SystemExit(f"{trait_id}: unknown sv_type {sv_type!r}")
    return {
        "ogId": row["orthogroup"],
        "eventId": row["event_id"],
        "impactClass": impact,
        "cultivar": row["cultivar"],
        "geneId": _as_str_or_none(row["gene_id"]),
        "chr": row["chrom"],
        "start": int(row["start"]),
        "end": int(row["end"]),
        "svType": sv_type,
        "absDeltaAf": _as_float_or_none(row["gap"]),
        "traitId": trait_id,
        "groupFreqs": _parse_json_map(row["group_freqs"], "group_freqs", trait_id),
    }


# ── Block ID helpers ───────────────────────────────────────────────────────

def _auto_block_id(chrom: str, bin_start: int, bin_end: int) -> str:
    return f"bin_{chrom}_{bin_start}_{bin_end}"


def _bin_for_pos(chrom: str, pos: int) -> tuple[str, int, int]:
    start = (pos // BLOCK_BIN_BP) * BLOCK_BIN_BP
    end = start + BLOCK_BIN_BP - 1
    return chrom, start, end


def _neighbor_block_ids(chrom: str, bin_start: int) -> list[str]:
    prev_start = bin_start - BLOCK_BIN_BP
    next_start = bin_start + BLOCK_BIN_BP
    out: list[str] = []
    if prev_start >= 0:
        out.append(_auto_block_id(chrom, prev_start, prev_start + BLOCK_BIN_BP - 1))
    out.append(_auto_block_id(chrom, next_start, next_start + BLOCK_BIN_BP - 1))
    return out


# ── Block summary row → block doc (auto) ───────────────────────────────────

_CANDIDATE_TYPE_RE = re.compile(r"([a-z_]+):(\d+)")
_TOP_SV_RE = re.compile(r"(EV\d+):(\d+)")


def _parse_candidate_types(value: str) -> dict[str, int]:
    out: dict[str, int] = {}
    for m in _CANDIDATE_TYPE_RE.finditer(value):
        ctype, n = m.group(1), int(m.group(2))
        if ctype not in _CANDIDATE_TYPES:
            raise SystemExit(f"block summary: unknown candidate_type {ctype!r}")
        out[ctype] = n
    return out


def _parse_top_svs(value: str) -> list[dict[str, int]]:
    return [
        {"eventId": m.group(1), "count": int(m.group(2))}
        for m in _TOP_SV_RE.finditer(value)
    ]


def _classify_block_type(candidate_types: dict[str, int]) -> str:
    """Simple mapping from candidate type mix to block type badge."""
    if not candidate_types:
        return "og_sv_block"
    dominant = max(candidate_types.items(), key=lambda kv: kv[1])[0]
    if dominant == "sv_regulatory":
        return "sv_regulatory_block"
    if dominant == "cnv_dosage":
        return "cnv_block"
    if dominant == "haplotype_block":
        return "shared_linked_block"
    return "og_sv_block"


def _build_auto_block_doc(
    row: dict[str, str],
    trait_id: str,
    run_id: str,
    now_iso: str,
    annotated_line: str,
    group_counts: dict[str, int],
    group_labels: list[str],
    block_set_version: int,
    intersection_release_id: str,
) -> dict[str, Any]:
    chrom = row["chrom"]
    bin_start = int(row["bin_start"])
    bin_end = int(row["bin_end"])
    candidate_types = _parse_candidate_types(row["candidate_types"])
    top_svs = _parse_top_svs(row["top_svs"])
    top_og_ids = [og for og in row["top_ogs"].split(",") if og]

    representative_annotations: list[str] = []
    if annotated_line:
        # annotated_ogs column: "OG0000987 (Conserved hypothetical protein.)"
        representative_annotations = [seg.strip() for seg in annotated_line.split(";") if seg.strip()]

    block_type = _classify_block_type(candidate_types)
    block_id = _auto_block_id(chrom, bin_start, bin_end)

    # repeated family heuristic: same bracketed family keyword 3+ times
    repeated_family = False
    lowered = annotated_line.lower()
    for fam in ("nlr", "wak", "nb-arc", "nbs-lrr"):
        if lowered.count(fam) >= 3:
            repeated_family = True
            break

    return {
        "blockId": block_id,
        "runId": run_id,
        "traitId": trait_id,
        "region": {"chr": chrom, "start": bin_start, "end": bin_end},
        "groupLabels": group_labels,
        "groupCounts": group_counts,
        "blockType": block_type,
        "curated": False,
        "curationNote": None,
        "summaryMarkdown": None,
        "svCount": sum(e["count"] for e in top_svs),
        "candidateOgCount": int(row["candidate_count"]),
        "intersectionCount": 0,  # filled after step4 cross-join
        "dominantSvType": None,
        "blockSpecificityGap": None,
        "representativeAnnotations": representative_annotations,
        "repeatedFamilyFlag": repeated_family,
        "leadSvs": [],          # filled in second pass if needed
        "leadOgs": [],          # filled in second pass if needed
        "interpretationSummary": None,  # narrative layer generates in UI
        "evidenceStatus": {
            "groupSpecificity": "ready",
            "svImpact": "ready",
            "ogPattern": "ready",
            "function": "partial" if representative_annotations else "pending",
            "expression": "pending",
            "qtl": "external_future",
        },
        "caveats": [
            "Candidate block is a review unit; window boundaries do not imply an inferred haplotype.",
            "Small-sample candidate discovery only.",
        ],
        "sharedWithRuns": [],
        "neighborBlockIds": _neighbor_block_ids(chrom, bin_start),
        "blockSetVersion": block_set_version,
        "intersectionReleaseId": intersection_release_id,
        "createdAt": now_iso,
        "topOgIds": top_og_ids,
        "topSvs": top_svs,
        "candidateTypeCounts": candidate_types,
    }


# ── Curated block ──────────────────────────────────────────────────────────

_REGION_RE = re.compile(r"Region:\s*(chr\S+):(\d+)-(\d+)")
_TRAITS_RE = re.compile(r"Traits?:\s*([^\n]+)")


def _parse_curated_summary(summary_md: str) -> tuple[list[str], str, int, int]:
    t_match = _TRAITS_RE.search(summary_md)
    r_match = _REGION_RE.search(summary_md)
    if not t_match or not r_match:
        raise SystemExit("curated summary.md missing Traits: or Region: line")
    traits = [t.strip() for t in t_match.group(1).split(",") if t.strip()]
    chrom = r_match.group(1)
    start = int(r_match.group(2))
    end = int(r_match.group(3))
    return traits, chrom, start, end


def _build_curated_block_doc(
    block_name: str,
    trait_id: str,
    run_id: str,
    now_iso: str,
    summary_md: str,
    chrom: str,
    start: int,
    end: int,
    trait_candidates: list[dict[str, Any]],
    trait_intersections: list[dict[str, Any]],
    group_counts: dict[str, int],
    group_labels: list[str],
    block_set_version: int,
    intersection_release_id: str,
) -> dict[str, Any]:
    # Aggregate from the trait-scoped subsets
    candidate_types: dict[str, int] = defaultdict(int)
    annotated: set[str] = set()
    for c in trait_candidates:
        candidate_types[c["candidateType"]] += 1
        if c.get("functionSummary"):
            annotated.add(c["functionSummary"])

    top_svs_counter: dict[str, int] = defaultdict(int)
    for inter in trait_intersections:
        top_svs_counter[inter["eventId"]] += 1
    top_svs = [
        {"eventId": k, "count": v}
        for k, v in sorted(top_svs_counter.items(), key=lambda kv: kv[1], reverse=True)[:8]
    ]

    # repeated family heuristic from annotations
    lowered = " ".join(annotated).lower()
    repeated_family = any(lowered.count(fam) >= 3 for fam in ("nlr", "wak", "nb-arc", "nbs-lrr"))

    block_type = _classify_block_type(dict(candidate_types))

    return {
        "blockId": f"curated_{block_name}",
        "runId": run_id,
        "traitId": trait_id,
        "region": {"chr": chrom, "start": start, "end": end},
        "groupLabels": group_labels,
        "groupCounts": group_counts,
        "blockType": block_type,
        "curated": True,
        "curationNote": f"Manually curated for {', '.join(sorted([trait_id]))}.",
        "summaryMarkdown": summary_md,
        "svCount": sum(e["count"] for e in top_svs),
        "candidateOgCount": len(trait_candidates),
        "intersectionCount": len(trait_intersections),
        "dominantSvType": None,
        "blockSpecificityGap": None,
        "representativeAnnotations": sorted(annotated)[:10],
        "repeatedFamilyFlag": repeated_family,
        "leadSvs": [],
        "leadOgs": [],
        "interpretationSummary": None,
        "evidenceStatus": {
            "groupSpecificity": "ready",
            "svImpact": "ready",
            "ogPattern": "ready",
            "function": "partial" if annotated else "pending",
            "expression": "pending",
            "qtl": "external_future",
        },
        "caveats": [
            "Curated review region — biological review unit, not validated locus.",
            "Window boundaries do not imply an inferred haplotype.",
            "Small-sample candidate discovery only.",
        ],
        "sharedWithRuns": [],
        "neighborBlockIds": [],
        "blockSetVersion": block_set_version,
        "intersectionReleaseId": intersection_release_id,
        "createdAt": now_iso,
        "topOgIds": [c["candidateId"] for c in trait_candidates[:10]],
        "topSvs": top_svs,
        "candidateTypeCounts": dict(candidate_types),
    }


# ── Storage helpers ────────────────────────────────────────────────────────

def _write_storage_gz(bucket, path: str, body: dict, *, dry_run: bool, out_dir: Path) -> None:
    raw = json.dumps(body, separators=(",", ":")).encode("utf-8")
    gz = gzip.compress(raw, compresslevel=6)
    if dry_run:
        target = out_dir / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(raw)
        return
    blob = bucket.blob(path)
    blob.content_encoding = "gzip"
    blob.cache_control = "public, max-age=3600"
    blob.upload_from_string(gz, content_type="application/json; charset=utf-8")


# ── Main orchestration ─────────────────────────────────────────────────────

def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--run-dir", type=Path, required=True)
    ap.add_argument("--sv-version", type=int, default=SV_VERSION_DEFAULT)
    ap.add_argument("--scoring-version", type=int, default=SCORING_VERSION_DEFAULT)
    ap.add_argument("--gene-model-version", type=int, default=GENE_MODEL_VERSION_DEFAULT)
    ap.add_argument("--grouping-version", type=int, default=GROUPING_VERSION_DEFAULT)
    ap.add_argument("--orthofinder-version", type=int, default=ORTHOFINDER_VERSION_DEFAULT)
    ap.add_argument("--block-set-version", type=int, default=BLOCK_SET_VERSION_DEFAULT)
    ap.add_argument("--intersection-release-id", type=str, default=INTERSECTION_RELEASE_ID_DEFAULT)
    ap.add_argument("--sv-release-id", type=str, default=SV_RELEASE_ID_DEFAULT)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--out-dir", type=Path, default=PROJECT_ROOT / "tmp/promote")
    args = ap.parse_args()

    run_dir = args.run_dir.resolve()
    if not run_dir.is_dir():
        raise SystemExit(f"run_dir not found: {run_dir}")

    # Use CLI args as the authoritative values (stand-alone, no module-level rebinding).
    block_set_version = args.block_set_version
    intersection_release_id = args.intersection_release_id
    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    # Step 1 groupings: needed for group_labels + group_counts per trait.
    # Server file is {"generatedAt": ..., "groupings": {trait: {...}}}.
    step1_payload = json.loads((run_dir / "step1_groupings.json").read_text(encoding="utf-8"))
    groupings_raw = step1_payload.get("groupings") or {}

    def _compute_group_counts(assignments: dict[str, dict]) -> dict[str, int]:
        out: dict[str, int] = defaultdict(int)
        for a in assignments.values():
            if a.get("borderline"):
                continue
            label = a.get("groupLabel")
            if label:
                out[label] += 1
        return dict(out)

    groupings: dict[str, dict] = {
        trait: {
            "groupLabels": trait_info.get("groupLabels") or [],
            "groupCounts": _compute_group_counts(trait_info.get("assignments") or {}),
            "usable": bool(trait_info.get("usable", True)),
        }
        for trait, trait_info in groupings_raw.items()
    }

    # Collect curated summaries (parsed once, filtered per trait)
    curated_dir = run_dir / "curated_blocks"
    curated_blocks_raw: list[dict[str, Any]] = []
    if curated_dir.is_dir():
        for block_dir in sorted(curated_dir.iterdir()):
            if not block_dir.is_dir():
                continue
            summary_md = (block_dir / "summary.md").read_text(encoding="utf-8")
            traits, chrom, start, end = _parse_curated_summary(summary_md)
            candidates_tsv = block_dir / "candidates.tsv"
            intersections_tsv = block_dir / "intersections.tsv"
            curated_blocks_raw.append({
                "name": block_dir.name,
                "summaryMd": summary_md,
                "traits": traits,
                "chr": chrom,
                "start": start,
                "end": end,
                "candidatesTsv": candidates_tsv if candidates_tsv.exists() else None,
                "intersectionsTsv": intersections_tsv if intersections_tsv.exists() else None,
            })

    db, bucket = (None, None) if args.dry_run else init_firebase()
    if args.dry_run:
        args.out_dir.mkdir(parents=True, exist_ok=True)

    # Aggregators across traits for og_sv_intersections by_og bundle
    intersections_by_og: dict[str, list[dict[str, Any]]] = defaultdict(list)
    total_rows_intersections = 0

    # Per-OG and per-gene block backlinks for entity_analysis_index updates
    og_block_links: dict[str, list[dict[str, Any]]] = defaultdict(list)
    gene_block_links: dict[str, list[dict[str, Any]]] = defaultdict(list)

    run_summaries: list[dict[str, Any]] = []

    # ── Per-trait loop ─────────────────────────────────────────────────────
    for trait_id, trait_info in sorted(groupings.items()):
        run_id = encode_run_id(
            trait_id, args.grouping_version, args.orthofinder_version,
            args.sv_version, args.gene_model_version, args.scoring_version,
        )
        group_labels = list(trait_info.get("groupLabels") or [])
        group_counts = dict(trait_info.get("groupCounts") or {})
        if len(group_labels) != 2:
            print(f"  skip {trait_id}: expected 2 group labels, got {group_labels}")
            continue

        step5_path = run_dir / "step5_candidates" / f"{trait_id}.tsv"
        step4_path = run_dir / "step4_intersections" / f"{trait_id}.tsv"
        if not step5_path.exists() or not step4_path.exists():
            print(f"  skip {trait_id}: missing step5 or step4 TSV")
            continue

        step5_rows = _read_tsv(step5_path, _STEP5_COLUMNS)
        step4_rows = _read_tsv(step4_path, _STEP4_COLUMNS)

        # Build candidate docs
        promoted = [
            _build_candidate_doc(r, trait_id, run_id, now_iso)
            for r in step5_rows
        ]
        promoted.sort(
            key=lambda p: (p.doc["combinedScore"] or 0.0, -(p.doc["baseRank"] or 1_000_000)),
            reverse=True,
        )
        for i, p in enumerate(promoted):
            p.doc["rank"] = i + 1

        # Build intersections
        intersections = [_build_intersection_row(r, trait_id) for r in step4_rows]
        total_rows_intersections += len(intersections)
        for inter in intersections:
            intersections_by_og[inter["ogId"]].append({**inter, "runId": run_id})

        # Build auto blocks (from followup_block_summary filtered to this trait)
        block_summary_path = run_dir / "followup_block_summary.tsv"
        block_docs: list[dict[str, Any]] = []
        if block_summary_path.exists():
            for row in _read_tsv(block_summary_path, _BLOCK_SUMMARY_COLUMNS):
                if row["trait"] != trait_id:
                    continue
                block_docs.append(_build_auto_block_doc(
                    row, trait_id, run_id, now_iso,
                    row.get("annotated_ogs", ""),
                    group_counts, group_labels,
                    block_set_version, intersection_release_id,
                ))

        # Curated blocks for this trait
        for cb in curated_blocks_raw:
            if trait_id not in cb["traits"]:
                continue
            # filter candidates/intersections by trait from the curated TSVs
            trait_curated_cands: list[dict[str, Any]] = []
            if cb["candidatesTsv"]:
                # curated candidates.tsv includes a `trait` column; use DictReader
                with cb["candidatesTsv"].open(encoding="utf-8", newline="") as fh:
                    for row in csv.DictReader(fh, delimiter="\t"):
                        if row.get("trait") != trait_id:
                            continue
                        trait_curated_cands.append({
                            "candidateId": row.get("orthogroup"),
                            "candidateType": row.get("candidate_type"),
                            "functionSummary": row.get("function_summary") or None,
                        })
            trait_curated_inter: list[dict[str, Any]] = []
            if cb["intersectionsTsv"]:
                with cb["intersectionsTsv"].open(encoding="utf-8", newline="") as fh:
                    for row in csv.DictReader(fh, delimiter="\t"):
                        if row.get("trait") != trait_id:
                            continue
                        trait_curated_inter.append({
                            "ogId": row.get("orthogroup"),
                            "eventId": row.get("event_id"),
                            "impactClass": row.get("impact_class"),
                        })
            block_docs.append(_build_curated_block_doc(
                cb["name"], trait_id, run_id, now_iso,
                cb["summaryMd"], cb["chr"], cb["start"], cb["end"],
                trait_curated_cands, trait_curated_inter,
                group_counts, group_labels,
                block_set_version, intersection_release_id,
            ))

        # Cross-join intersections onto blocks (intersectionCount) +
        # assign blockId to candidates by bin containment
        block_intersection_count: dict[str, int] = defaultdict(int)
        for inter in intersections:
            chrom, bin_start, _bin_end = _bin_for_pos(inter["chr"], inter["start"])
            block_intersection_count[_auto_block_id(chrom, bin_start, bin_start + BLOCK_BIN_BP - 1)] += 1
        for b in block_docs:
            if not b["curated"]:
                b["intersectionCount"] = block_intersection_count.get(b["blockId"], 0)
            else:
                # curated span may cover multiple bins
                chrom = b["region"]["chr"]
                start = b["region"]["start"]
                end = b["region"]["end"]
                total = 0
                cursor = (start // BLOCK_BIN_BP) * BLOCK_BIN_BP
                while cursor <= end:
                    total += block_intersection_count.get(
                        _auto_block_id(chrom, cursor, cursor + BLOCK_BIN_BP - 1), 0
                    )
                    cursor += BLOCK_BIN_BP
                b["intersectionCount"] = total

        # Assign blockId to each candidate — only if a real block doc exists
        # for this (trait, blockId). Curated wins when overlap.
        block_docs_by_id = {b["blockId"]: b for b in block_docs}
        curated_by_chr: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for b in block_docs:
            if b["curated"]:
                curated_by_chr[b["region"]["chr"]].append(b)

        for p in promoted:
            if not p.chrom or p.start is None:
                continue
            chosen_block_id: str | None = None
            for cb_doc in curated_by_chr.get(p.chrom, []):
                if cb_doc["region"]["start"] <= p.start <= cb_doc["region"]["end"]:
                    chosen_block_id = cb_doc["blockId"]
                    break
            if not chosen_block_id:
                chrom, bin_start, _e = _bin_for_pos(p.chrom, p.start)
                candidate_auto_id = _auto_block_id(chrom, bin_start, bin_start + BLOCK_BIN_BP - 1)
                if candidate_auto_id in block_docs_by_id:
                    chosen_block_id = candidate_auto_id
            if not chosen_block_id:
                continue  # candidate sits outside any materialised review block

            p.doc["blockId"] = chosen_block_id
            b_doc = block_docs_by_id[chosen_block_id]
            backlink = {
                "runId": run_id,
                "blockId": chosen_block_id,
                "traitId": trait_id,
                "chr": b_doc["region"]["chr"],
                "start": b_doc["region"]["start"],
                "end": b_doc["region"]["end"],
                "curated": b_doc["curated"],
            }
            og_block_links[p.doc["primaryOgId"]].append(backlink)
            # Gene-level backlink: key on bestSv.geneId (cultivar gene
            # where the SV lands). Drives the Gene detail
            # `Candidate blocks in analyses` panel.
            lead_gene = p.doc.get("leadGeneId")
            if lead_gene:
                gene_block_links[lead_gene].append(backlink)

        # Determine topBlockIds (curated first, then by candidateOgCount desc)
        def _block_sort_key(b: dict[str, Any]) -> tuple[int, int]:
            return (0 if b["curated"] else 1, -b["candidateOgCount"])
        sorted_blocks = sorted(block_docs, key=_block_sort_key)
        top_block_ids = [b["blockId"] for b in sorted_blocks[:5]]

        # Build run-header doc
        run_doc = {
            "runId": run_id,
            "traitId": trait_id,
            "groupingVersion": args.grouping_version,
            "orthofinderVersion": args.orthofinder_version,
            "svReleaseId": args.sv_release_id,
            "intersectionReleaseId": args.intersection_release_id,
            "geneModelVersion": args.gene_model_version,
            "scoringVersion": args.scoring_version,
            "sampleSetVersion": f"gm{args.gene_model_version}",
            "sampleCount": sum(group_counts.values()) or args.gene_model_version,
            "status": "ready",
            "stepAvailability": {
                "phenotype": "ready",
                "orthogroups": "ready",
                "variants": "ready",
                "intersections": "ready",
                "candidates": "ready",
            },
            "candidateCount": len(promoted),
            "blockCount": len(block_docs),
            "topBlockIds": top_block_ids,
            "blockSetVersion": args.block_set_version,
            "createdAt": now_iso,
            "updatedAt": now_iso,
        }
        run_summaries.append(run_doc)

        # Persist
        if args.dry_run:
            base = args.out_dir / "analysis_runs" / run_id
            base.mkdir(parents=True, exist_ok=True)
            (base / "run.json").write_text(json.dumps(run_doc, indent=2), encoding="utf-8")
            (base / "candidates").mkdir(exist_ok=True)
            for p in promoted:
                (base / "candidates" / f"{p.doc['candidateId']}.json").write_text(
                    json.dumps(p.doc, indent=2), encoding="utf-8"
                )
            (base / "blocks").mkdir(exist_ok=True)
            for b in block_docs:
                (base / "blocks" / f"{b['blockId']}.json").write_text(
                    json.dumps(b, indent=2), encoding="utf-8"
                )
            _write_storage_gz(
                bucket, f"analysis_runs/{run_id}/step4_intersections.json.gz",
                {"schemaVersion": SCHEMA_VERSION, "runId": run_id, "traitId": trait_id,
                 "intersectionReleaseId": args.intersection_release_id,
                 "rows": intersections},
                dry_run=True, out_dir=args.out_dir,
            )
            print(f"  dry-run {trait_id} → {run_id}  · cands {len(promoted)}  blocks {len(block_docs)}  inter {len(intersections)}")
        else:
            db.collection("analysis_runs").document(run_id).set(run_doc)
            # Candidates (batched)
            col = db.collection("analysis_runs").document(run_id).collection("candidates")
            batch = db.batch(); ops = 0
            for p in promoted:
                batch.set(col.document(p.doc["candidateId"]), p.doc)
                ops += 1
                if ops >= 450:
                    batch.commit(); batch = db.batch(); ops = 0
            if ops:
                batch.commit()
            # Blocks (batched)
            col_b = db.collection("analysis_runs").document(run_id).collection("blocks")
            batch = db.batch(); ops = 0
            for b in block_docs:
                batch.set(col_b.document(b["blockId"]), b)
                ops += 1
                if ops >= 450:
                    batch.commit(); batch = db.batch(); ops = 0
            if ops:
                batch.commit()
            # Step4 intersections bundle (Storage)
            _write_storage_gz(
                bucket, f"analysis_runs/{run_id}/step4_intersections.json.gz",
                {"schemaVersion": SCHEMA_VERSION, "runId": run_id, "traitId": trait_id,
                 "intersectionReleaseId": args.intersection_release_id,
                 "rows": intersections},
                dry_run=False, out_dir=args.out_dir,
            )
            print(f"  live {trait_id} → {run_id}  · cands {len(promoted)}  blocks {len(block_docs)}  inter {len(intersections)}")

    # ── og_sv_intersections/{intRelId}/by_og bundles ──────────────────────
    for og_id, rows in intersections_by_og.items():
        bundle = {
            "schemaVersion": SCHEMA_VERSION,
            "intersectionReleaseId": args.intersection_release_id,
            "ogId": og_id,
            "runs": [],
            "createdAt": now_iso,
        }
        by_run: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for r in rows:
            by_run[r["runId"]].append({k: v for k, v in r.items() if k != "runId"})
        bundle["runs"] = [
            {"runId": rid, "traitId": next((row["traitId"] for row in rws), ""), "rows": rws}
            for rid, rws in by_run.items()
        ]
        _write_storage_gz(
            bucket,
            f"og_sv_intersections/{args.intersection_release_id}/by_og/{og_id}.json.gz",
            bundle, dry_run=args.dry_run, out_dir=args.out_dir,
        )

    # ── intersection_releases header (Firestore) ──────────────────────────
    release_doc = {
        "intersectionReleaseId": args.intersection_release_id,
        "svReleaseId": args.sv_release_id,
        "geneModelVersion": args.gene_model_version,
        "promoterWindowBp": 2000,
        "enclosurePolicy": "gene_body",
        "rowCount": total_rows_intersections,
        "status": "ready",
        "createdAt": now_iso,
    }
    if args.dry_run:
        (args.out_dir / "intersection_releases").mkdir(parents=True, exist_ok=True)
        (args.out_dir / "intersection_releases" / f"{args.intersection_release_id}.json").write_text(
            json.dumps(release_doc, indent=2), encoding="utf-8"
        )
    else:
        db.collection("intersection_releases").document(args.intersection_release_id).set(release_doc)

    # ── entity_analysis_index/{og,gene}_{id} topBlocks merge ──────────────
    entity_updates: list[tuple[str, list[dict[str, Any]]]] = [
        *((f"og_{k}", v) for k, v in og_block_links.items()),
        *((f"gene_{k}", v) for k, v in gene_block_links.items()),
    ]
    if args.dry_run:
        (args.out_dir / "entity_analysis_index").mkdir(parents=True, exist_ok=True)
        for key, links in entity_updates:
            (args.out_dir / "entity_analysis_index" / f"{key}.topBlocks.json").write_text(
                json.dumps(links[:10], indent=2), encoding="utf-8"
            )
    else:
        batch = db.batch(); ops = 0
        for key, links in entity_updates:
            ref = db.collection("entity_analysis_index").document(key)
            batch.set(ref, {"topBlocks": links[:10], "latestUpdatedAt": now_iso}, merge=True)
            ops += 1
            if ops >= 450:
                batch.commit(); batch = db.batch(); ops = 0
        if ops:
            batch.commit()

    print(
        f"\nDone. runs={len(run_summaries)} cands_total={sum(r['candidateCount'] for r in run_summaries)} "
        f"blocks_total={sum(r['blockCount'] for r in run_summaries)} "
        f"intersections_total={total_rows_intersections} "
        f"ogs_with_blocks={len(og_block_links)} genes_with_blocks={len(gene_block_links)} "
        f"dry_run={args.dry_run}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())

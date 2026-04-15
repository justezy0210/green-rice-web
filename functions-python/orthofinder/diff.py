"""
Group differential computation for orthogroups.
Vectorized Mann-Whitney U (scipy 1.7+) + BH FDR correction across all tested OGs.
"""

from datetime import datetime, timezone

import numpy as np
from scipy import stats

from .gene_annotation import lookup_representative
from .models import (
    OrthogroupDiffDocument,
    OrthogroupDiffEntry,
    OrthogroupRepresentative,
    diff_document_to_dict,
)
from .stats import bh_correction

# Option A selection policy: nominal raw p-value + effect size.
# Rationale: with n=11 cultivars, BH-corrected q-values almost never reach 0.05 no matter
# how real the signal is (math: min p ≈ 0.004 × 40k tests / 1 ≈ 160 → clamped to 1).
# Raw p-value + effect size is more useful for exploratory candidate discovery at this n.
P_STRICT = 0.05
P_RELAXED = 0.10
MIN_EFFECT = 0.5
FALLBACK_MIN_HITS = 5
FALLBACK_TOP_N = 10
MAX_CANDIDATES = 200


def compute_diff_for_trait(
    trait_id: str,
    grouping_assignments: dict,
    matrix: dict,
    baegilmi_genes_by_og: dict,
    gene_annotation: dict,
    grouping_version: int,
    orthofinder_version: int,
) -> OrthogroupDiffDocument | None:
    """Compute filtered significant orthogroups for one trait. Locked to k=2."""
    group_members: dict[str, list[str]] = {}
    for cid, a in grouping_assignments.items():
        if a.get("borderline"):
            continue
        lbl = a.get("groupLabel")
        if not lbl:
            continue
        group_members.setdefault(lbl, []).append(cid)

    if len(group_members) != 2:
        return None

    group_labels = sorted(group_members.keys())
    g1, g2 = group_labels
    g1_members = group_members[g1]
    g2_members = group_members[g2]
    if not g1_members or not g2_members:
        return None

    og_ids = list(matrix.keys())
    if not og_ids:
        return None

    # Build 2D count matrices (defensive int conversion).
    g1_mat, g2_mat, valid_og_indices = _build_count_matrices(
        og_ids, matrix, g1_members, g2_members
    )
    if valid_og_indices.size == 0:
        return None

    # Restrict og_ids/matrices to rows that survived input validation
    valid_og_ids = [og_ids[i] for i in valid_og_indices]
    n1, n2 = len(g1_members), len(g2_members)

    # Vectorized summary stats
    means_g1 = g1_mat.mean(axis=1)
    means_g2 = g2_mat.mean(axis=1)
    presence_g1 = (g1_mat >= 1).mean(axis=1)
    presence_g2 = (g2_mat >= 1).mean(axis=1)
    mean_diffs = np.abs(means_g1 - means_g2)
    presence_diffs = np.abs(presence_g1 - presence_g2)

    # Signed log2 fold change: log2(g2_mean / g1_mean). Sign tells which group is higher.
    with np.errstate(divide="ignore", invalid="ignore"):
        signed_log2_fcs = np.where(
            (means_g1 > 0) & (means_g2 > 0),
            np.log2(means_g2 / means_g1),
            np.nan,
        )

    # Vectorized Mann-Whitney U across ALL valid OGs (asymptotic for speed).
    # NOTE: We test every OG so the BH denominator reflects the full trait-wide hypothesis set,
    # NOT a subset. Pre-filtering by effect size before BH would inflate significance.
    mwu_result = stats.mannwhitneyu(
        g1_mat, g2_mat, alternative="two-sided", axis=1, method="asymptotic"
    )
    u_stats = np.asarray(mwu_result.statistic, dtype=float)
    p_values = np.asarray(mwu_result.pvalue, dtype=float)

    # Drop OGs where both groups are identical constants (NaN p).
    mwu_valid = ~np.isnan(p_values)
    if not mwu_valid.any():
        return None

    valid_p = p_values[mwu_valid]
    q_all = np.array(bh_correction(valid_p.tolist()))  # BH across the full tested set
    valid_idx_local = np.where(mwu_valid)[0]
    total_tested = int(valid_idx_local.size)

    # Assemble candidates (one per valid-tested OG).
    candidates: list[dict] = []
    for k, i in enumerate(valid_idx_local):
        log2_v = float(signed_log2_fcs[i]) if not np.isnan(signed_log2_fcs[i]) else None
        candidates.append({
            "og_id": valid_og_ids[i],
            "means": {g1: float(means_g1[i]), g2: float(means_g2[i])},
            "presence": {g1: float(presence_g1[i]), g2: float(presence_g2[i])},
            "cult_counts": {g1: n1, g2: n2},
            "mean_diff": float(mean_diffs[i]),
            "presence_diff": float(presence_diffs[i]),
            "log2_fc": log2_v,
            "u_stat": float(u_stats[i]),
            "p_value": float(valid_p[k]),
            "q_value": float(q_all[k]),
        })

    selected, mode, thresholds, passed_count = _select_candidates(candidates)

    entries: list[OrthogroupDiffEntry] = []
    for c in selected[:MAX_CANDIDATES]:
        rep_obj = None
        baegilmi_genes = baegilmi_genes_by_og.get(c["og_id"], [])
        rep_dict = lookup_representative(baegilmi_genes, gene_annotation)
        if rep_dict is not None:
            rep_obj = OrthogroupRepresentative(
                source=rep_dict["source"],
                geneId=rep_dict["geneId"],
                chromosome=rep_dict["chromosome"],
                start=rep_dict["start"],
                end=rep_dict["end"],
                strand=rep_dict["strand"],
                attributes=rep_dict["attributes"],
            )
        entries.append(OrthogroupDiffEntry(
            orthogroup=c["og_id"],
            meansByGroup=c["means"],
            presenceByGroup=c["presence"],
            cultivarCountsByGroup=c["cult_counts"],
            meanDiff=c["mean_diff"],
            presenceDiff=c["presence_diff"],
            log2FoldChange=c["log2_fc"],
            uStatistic=c["u_stat"],
            pValue=c["p_value"],
            qValue=c["q_value"],
            representative=rep_obj,
        ))

    return OrthogroupDiffDocument(
        traitId=trait_id,
        groupLabels=group_labels,
        top=entries,
        selectionMode=mode,
        thresholds=thresholds,
        totalTested=total_tested,
        passedCount=passed_count,
        computedAt=datetime.now(timezone.utc).isoformat(),
        groupingVersion=grouping_version,
        orthofinderVersion=orthofinder_version,
    )


def _build_count_matrices(
    og_ids: list[str],
    matrix: dict,
    g1_members: list[str],
    g2_members: list[str],
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Build (g1_mat, g2_mat, valid_og_indices). Rows that fail int coercion are dropped rather
    than aborting the whole recompute.
    """
    g1_rows: list[list[float]] = []
    g2_rows: list[list[float]] = []
    valid: list[int] = []
    for idx, og in enumerate(og_ids):
        cell = matrix.get(og, {})
        try:
            g1_row = [int(cell.get(cid, 0) or 0) for cid in g1_members]
            g2_row = [int(cell.get(cid, 0) or 0) for cid in g2_members]
        except (TypeError, ValueError):
            continue  # skip malformed row instead of breaking entire trait
        g1_rows.append(g1_row)
        g2_rows.append(g2_row)
        valid.append(idx)
    if not valid:
        return np.empty((0, len(g1_members))), np.empty((0, len(g2_members))), np.array([], dtype=int)
    return (
        np.asarray(g1_rows, dtype=float),
        np.asarray(g2_rows, dtype=float),
        np.asarray(valid, dtype=int),
    )


def _select_candidates(candidates: list[dict]):
    """
    Apply selection filter (raw p-value + effect size) with fallback.
    Returns (selected_list, mode, thresholds_dict, passed_count).
    """
    def passes(c: dict, p_cutoff: float) -> bool:
        return c["p_value"] < p_cutoff and c["mean_diff"] >= MIN_EFFECT

    strict = [c for c in candidates if passes(c, P_STRICT)]
    if len(strict) >= FALLBACK_MIN_HITS:
        strict.sort(key=lambda c: (c["p_value"], -c["mean_diff"]))
        return (
            strict,
            "strict",
            {"pValue": P_STRICT, "meanDiff": MIN_EFFECT},
            len(strict),
        )

    relaxed = [c for c in candidates if passes(c, P_RELAXED)]
    if len(relaxed) >= FALLBACK_MIN_HITS:
        relaxed.sort(key=lambda c: (c["p_value"], -c["mean_diff"]))
        return (
            relaxed,
            "relaxed",
            {"pValue": P_RELAXED, "meanDiff": MIN_EFFECT},
            len(relaxed),
        )

    # Fallback: show top N by raw p-value regardless of cutoff. passedCount reflects
    # only those that actually meet the relaxed cutoff.
    sorted_all = sorted(candidates, key=lambda c: (c["p_value"], -c["mean_diff"]))
    fallback = sorted_all[:FALLBACK_TOP_N]
    return (
        fallback,
        "top_n_fallback",
        {"pValue": P_RELAXED, "meanDiff": MIN_EFFECT},
        len(relaxed),
    )


def write_diff_document(db, doc: OrthogroupDiffDocument) -> None:
    db.collection("orthogroup_diffs").document(doc.traitId).set(diff_document_to_dict(doc))


def delete_diff_document(db, trait_id: str) -> None:
    db.collection("orthogroup_diffs").document(trait_id).delete()

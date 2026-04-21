"""Candidate scoring (Phase 2+) — Python mirror of src/lib/candidate-scoring.ts.

The TS side derives candidates client-side in Phase 2A. Phase 2B moves
the same computation to Python so the output can be stored in Firestore
and Storage, unlocking the entity-analysis reverse index and export
bundles.

Both sides MUST produce bit-identical results for the same `OrthogroupDiffEntry`
inputs. Changes to constants or weights here require a matching change in
src/lib/candidate-scoring.ts (and vice versa).

Scope: `og_only` candidate type only. SV-aware types (`og_plus_sv`,
`sv_regulatory`, `cnv_dosage`, `haplotype_block`) land in Phase 3+.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any, Literal

# ─────────────────────────────────────────────────────────────
# Constants (must stay in sync with TS)
# ─────────────────────────────────────────────────────────────

P_THRESHOLD = 0.05

GROUP_SPECIFICITY_MAX = 20.0
FUNCTION_MAX = 1.0
OG_PATTERN_MAX = 1.0

WEIGHT_GROUP_SPECIFICITY = 0.5
WEIGHT_FUNCTION = 0.25
WEIGHT_OG_PATTERN = 0.25

# ─────────────────────────────────────────────────────────────
# Types
# ─────────────────────────────────────────────────────────────

AxisStatus = Literal["ready", "pending", "partial", "external_future"]
CandidateType = Literal[
    "og_only", "og_plus_sv", "sv_regulatory", "cnv_dosage", "haplotype_block"
]


@dataclass(frozen=True)
class AxisScore:
    axis: str
    status: AxisStatus
    score: float | None
    note: str | None


@dataclass(frozen=True)
class ScoredCandidate:
    candidate_id: str
    run_id: str
    trait_id: str
    candidate_type: CandidateType
    primary_og_id: str
    lead_gene_id: str | None
    rank: int
    total_score: float
    score_breakdown: tuple[AxisScore, ...]
    group_specificity_summary: str
    function_summary: str | None
    orthogroup_pattern_summary: str
    badges: tuple[str, ...] = field(default_factory=tuple)


# ─────────────────────────────────────────────────────────────
# Axis scorers
# ─────────────────────────────────────────────────────────────


def _group_specificity(entry: dict[str, Any]) -> AxisScore:
    p_value = float(entry.get("pValue", 1.0))
    lfc = entry.get("log2FoldChange")
    abs_lfc = abs(float(lfc)) if lfc is not None else 0.0
    minus_log10_p = -math.log10(p_value) if p_value > 0 else 0.0
    score = minus_log10_p * (1.0 + abs_lfc)
    lfc_note = f", log2FC={abs_lfc * (1 if (lfc or 0) >= 0 else -1):.2f}" if lfc is not None else ""
    return AxisScore(
        axis="group_specificity",
        status="ready",
        score=score if math.isfinite(score) else 0.0,
        note=f"MWU p={p_value:.1e}{lfc_note}",
    )


def _function(entry: dict[str, Any]) -> AxisScore:
    rep = entry.get("representative") or {}
    descs = rep.get("descriptions") or {}
    real = [d for d in descs.values() if d and d != "NA"]
    if not real:
        return AxisScore(axis="function", status="ready", score=0.0, note="No functional annotation")
    plural = "" if len(real) == 1 else "s"
    return AxisScore(
        axis="function",
        status="ready",
        score=1.0,
        note=f"{len(real)} IRGSP descriptor{plural}",
    )


def _og_pattern(entry: dict[str, Any]) -> AxisScore:
    presence = entry.get("presenceByGroup") or {}
    values = [float(v) for v in presence.values()]
    if len(values) < 2:
        return AxisScore(axis="og_pattern", status="ready", score=0.0, note="Single group")
    gap = max(values) - min(values)
    clamped = max(0.0, min(1.0, gap))
    return AxisScore(
        axis="og_pattern",
        status="ready",
        score=clamped,
        note=f"Presence gap {gap:.2f} between groups",
    )


_PENDING_AXES: tuple[AxisScore, ...] = (
    AxisScore("sv_impact", "pending", None, "Awaiting SV matrix (Phase 3)"),
    AxisScore("synteny", "partial", None, "Cluster-local halLiftover only"),
    AxisScore("expression", "pending", None, "Bulk RNA-seq pending"),
    AxisScore("qtl", "external_future", None, "External QTL/GWAS DB integration deferred"),
)


# ─────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────


def score_entry(run_id: str, trait_id: str, entry: dict[str, Any]) -> ScoredCandidate | None:
    """Return a ScoredCandidate for this entry, or None if it fails the
    p-value threshold. rank is left at 0; call `rank_candidates` to assign.
    """
    p_value = entry.get("pValue")
    if p_value is None or not math.isfinite(float(p_value)) or float(p_value) > P_THRESHOLD:
        return None

    gs = _group_specificity(entry)
    fn = _function(entry)
    og = _og_pattern(entry)

    norm_gs = min(gs.score or 0.0, GROUP_SPECIFICITY_MAX) / GROUP_SPECIFICITY_MAX
    norm_fn = (fn.score or 0.0) / FUNCTION_MAX
    norm_og = (og.score or 0.0) / OG_PATTERN_MAX
    total = (
        WEIGHT_GROUP_SPECIFICITY * norm_gs
        + WEIGHT_FUNCTION * norm_fn
        + WEIGHT_OG_PATTERN * norm_og
    )

    rep = entry.get("representative") or {}
    descriptions = rep.get("descriptions") or {}
    primary_description: str | None = None
    for value in descriptions.values():
        if value and value != "NA":
            primary_description = value
            break
    transcripts = rep.get("transcripts") or []
    lead_gene = transcripts[0] if transcripts else None

    og_id = str(entry["orthogroup"])
    presence = entry.get("presenceByGroup") or {}
    presence_summary = " vs ".join(
        f"{label}: {float(v) * 100:.0f}% present" for label, v in presence.items()
    )

    p_fmt = f"{float(p_value):.1e}" if float(p_value) < 1e-4 else f"{float(p_value):.3f}"
    lfc = entry.get("log2FoldChange")
    parts: list[str] = [f"Δmean {float(entry.get('meanDiff', 0.0)):.2f}"]
    if lfc is not None:
        parts.append(f"log₂FC {float(lfc):.2f}")
    parts.append(f"p {p_fmt}")
    gs_summary = " · ".join(parts)

    return ScoredCandidate(
        candidate_id=og_id,
        run_id=run_id,
        trait_id=trait_id,
        candidate_type="og_only",
        primary_og_id=og_id,
        lead_gene_id=lead_gene,
        rank=0,
        total_score=total,
        score_breakdown=(gs, fn, og) + _PENDING_AXES,
        group_specificity_summary=gs_summary,
        function_summary=primary_description,
        orthogroup_pattern_summary=presence_summary,
    )


def rank_candidates(
    run_id: str, trait_id: str, entries: list[dict[str, Any]]
) -> list[ScoredCandidate]:
    """Score every entry, drop those that fail the threshold, sort
    descending by total_score, assign 1-based rank.
    """
    scored = [c for e in entries if (c := score_entry(run_id, trait_id, e)) is not None]
    scored.sort(key=lambda c: c.total_score, reverse=True)
    return [
        ScoredCandidate(**{**c.__dict__, "rank": i + 1})
        for i, c in enumerate(scored)
    ]

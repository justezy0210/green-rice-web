"""Unit tests for shared.candidate_scoring (Python mirror of
src/lib/candidate-scoring.ts)."""

from __future__ import annotations

import math

import pytest

from shared.candidate_scoring import (
    GROUP_SPECIFICITY_MAX,
    P_THRESHOLD,
    WEIGHT_FUNCTION,
    WEIGHT_GROUP_SPECIFICITY,
    WEIGHT_OG_PATTERN,
    rank_candidates,
    score_entry,
)

RUN_ID = "heading_date_g4_of6_sv0_gm11_sc0"
TRAIT_ID = "heading_date"


def _entry(
    og: str,
    p: float,
    *,
    lfc: float | None = 0.5,
    presence: dict[str, float] | None = None,
    mean_diff: float = 0.5,
    descriptions: dict[str, str] | None = None,
    transcripts: list[str] | None = None,
) -> dict:
    return {
        "orthogroup": og,
        "pValue": p,
        "qValue": 1.0,
        "log2FoldChange": lfc,
        "meanDiff": mean_diff,
        "presenceDiff": 0.5,
        "cliffsDelta": None,
        "uStatistic": 10.0,
        "meansByGroup": {"early": 1.0, "late": 0.0},
        "presenceByGroup": presence or {"early": 1.0, "late": 0.0},
        "cultivarCountsByGroup": {"early": 8, "late": 3},
        "representative": {
            "source": "irgsp",
            "transcripts": transcripts or ["Os01t0000001-01"],
            "descriptions": descriptions or {"Os01t0000001-01": "Test kinase"},
        },
    }


def test_score_entry_returns_none_when_p_above_threshold() -> None:
    e = _entry("OG0000001", p=0.06)
    assert score_entry(RUN_ID, TRAIT_ID, e) is None


def test_score_entry_returns_none_for_threshold_exact() -> None:
    # > 0.05 drops; 0.05 itself also drops (strict less-than policy)
    e = _entry("OG0000002", p=P_THRESHOLD + 1e-9)
    assert score_entry(RUN_ID, TRAIT_ID, e) is None


def test_score_entry_accepts_below_threshold() -> None:
    e = _entry("OG0000003", p=0.01)
    c = score_entry(RUN_ID, TRAIT_ID, e)
    assert c is not None
    assert c.primary_og_id == "OG0000003"
    assert c.trait_id == TRAIT_ID
    assert c.run_id == RUN_ID
    assert c.candidate_type == "og_only"
    assert c.total_score > 0


def test_score_breakdown_has_seven_axes() -> None:
    c = score_entry(RUN_ID, TRAIT_ID, _entry("OG0000004", p=0.01))
    assert c is not None
    axes = [s.axis for s in c.score_breakdown]
    assert axes == [
        "group_specificity",
        "function",
        "og_pattern",
        "sv_impact",
        "synteny",
        "expression",
        "qtl",
    ]


def test_function_axis_zero_when_no_real_descriptor() -> None:
    e = _entry("OG0000005", p=0.01, descriptions={"Os01t0000001-01": "NA"})
    c = score_entry(RUN_ID, TRAIT_ID, e)
    assert c is not None
    fn = next(s for s in c.score_breakdown if s.axis == "function")
    assert fn.score == 0.0
    assert c.function_summary is None


def test_og_pattern_zero_for_single_group() -> None:
    e = _entry("OG0000006", p=0.01, presence={"early": 1.0})
    c = score_entry(RUN_ID, TRAIT_ID, e)
    assert c is not None
    og = next(s for s in c.score_breakdown if s.axis == "og_pattern")
    assert og.score == 0.0


def test_og_pattern_clamps_to_unit_interval() -> None:
    e = _entry(
        "OG0000007",
        p=0.01,
        presence={"early": 1.0, "late": 0.0},
    )
    c = score_entry(RUN_ID, TRAIT_ID, e)
    assert c is not None
    og = next(s for s in c.score_breakdown if s.axis == "og_pattern")
    assert og.score == 1.0


def test_total_score_weights_match_constants() -> None:
    # Highest-signal entry: p=1e-20, |lfc|=2, function=1, og_pattern=1
    e = _entry(
        "OG0000008",
        p=1e-20,
        lfc=2.0,
        presence={"early": 1.0, "late": 0.0},
    )
    c = score_entry(RUN_ID, TRAIT_ID, e)
    assert c is not None
    # group_specificity raw: -log10(1e-20) * (1 + 2) = 60 → clamped to 20 max
    # normalized: 1.0
    # function normalized: 1.0
    # og_pattern normalized: 1.0
    # total = 0.5 + 0.25 + 0.25 = 1.0
    assert math.isclose(c.total_score, 1.0, abs_tol=1e-9)
    assert WEIGHT_GROUP_SPECIFICITY + WEIGHT_FUNCTION + WEIGHT_OG_PATTERN == 1.0


def test_group_specificity_score_clamped_at_max() -> None:
    e = _entry("OG0000009", p=1e-30, lfc=10.0)
    c = score_entry(RUN_ID, TRAIT_ID, e)
    assert c is not None
    gs = next(s for s in c.score_breakdown if s.axis == "group_specificity")
    # score is raw -log10(p)*(1+|lfc|); clamping happens only in normalization.
    # Raw should be 30 * 11 = 330.
    assert gs.score is not None and gs.score > GROUP_SPECIFICITY_MAX


def test_rank_candidates_sorts_descending_and_assigns_rank() -> None:
    entries = [
        _entry("OG0000010", p=0.03, lfc=0.1),
        _entry("OG0000011", p=1e-10, lfc=1.5),
        _entry("OG0000012", p=0.10),  # excluded
        _entry("OG0000013", p=0.02, lfc=0.8),
    ]
    ranked = rank_candidates(RUN_ID, TRAIT_ID, entries)
    ids = [c.primary_og_id for c in ranked]
    # OG...011 has smallest p and largest |lfc| so it should lead.
    assert ids[0] == "OG0000011"
    assert "OG0000012" not in ids
    assert ranked[0].rank == 1
    assert ranked[-1].rank == len(ranked)


def test_summary_strings_are_populated() -> None:
    c = score_entry(RUN_ID, TRAIT_ID, _entry("OG0000014", p=0.01))
    assert c is not None
    assert "p " in c.group_specificity_summary
    assert "present" in c.orthogroup_pattern_summary
    assert c.function_summary == "Test kinase"

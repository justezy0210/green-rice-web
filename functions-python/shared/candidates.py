"""Candidate-selection predicate — sole owner of analysisStatus logic.

Consumed ONLY by scripts/generate-download-bundles.py. The web UI never
calls this: it consumes the generator's output manifest instead. Keeping
this logic in one place closes the Round 1 Codex concern about UI and
generator drifting apart on what counts as a candidate.
"""

from dataclasses import dataclass
from typing import Literal

AnalysisStatus = Literal["strong", "borderline", "weak"]

STRONG_ADJ_P_MAX = 0.05
STRONG_EFFECT_ABS_MIN = 0.4
BORDERLINE_RAW_P_MAX = 0.05
EFFECT_ZERO_TOLERANCE = 1e-4


@dataclass(frozen=True)
class CandidateEntry:
    og_id: str
    p_value: float
    p_value_adj_bh: float | None
    log2_fc: float | None
    effect_size: float | None
    effect_size_sign: Literal["positive", "negative", "zero"]
    analysis_status: AnalysisStatus


def effect_sign(effect_size: float | None) -> Literal["positive", "negative", "zero"]:
    if effect_size is None or abs(effect_size) < EFFECT_ZERO_TOLERANCE:
        return "zero"
    return "positive" if effect_size > 0 else "negative"


def classify(p_value: float, p_value_adj_bh: float | None, effect_size: float | None) -> AnalysisStatus:
    """Bucket a single OG test result. `weak` catches everything tested but
    unremarkable; `not_tested` is NOT emitted here (usable=false traits
    produce zero data rows instead — see rev2 §7)."""
    abs_effect = abs(effect_size) if effect_size is not None else 0.0
    if (
        p_value_adj_bh is not None
        and p_value_adj_bh <= STRONG_ADJ_P_MAX
        and abs_effect >= STRONG_EFFECT_ABS_MIN
    ):
        return "strong"
    if p_value <= BORDERLINE_RAW_P_MAX:
        return "borderline"
    return "weak"


def is_surfaced_candidate(entry: CandidateEntry) -> bool:
    """Per rev2, all tested OGs surface; consumers filter by analysisStatus.
    This predicate therefore always returns True for entries passed in —
    the upstream diff pipeline already decides which OGs are tested."""
    _ = entry
    return True

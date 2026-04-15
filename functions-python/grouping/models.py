"""
Python mirror of src/types/grouping.ts.
Must stay in sync with the TypeScript canonical source.
"""

from dataclasses import dataclass, field, asdict
from typing import Literal

TraitType = Literal["multi-env", "single-continuous", "binary"]
Direction = Literal["higher-is-more", "higher-is-less", "not-applicable"]
Method = Literal["gmm", "fixed-class", "none"]
ScoreMetric = Literal["silhouette", "bic", "none"]
Confidence = Literal["high", "medium", "borderline"]
Status = Literal["idle", "running"]


@dataclass
class TraitMetadata:
    traitId: str
    type: TraitType
    keys: list[str]
    direction: Direction
    labels: dict  # {"low": str, "high": str}
    unit: str


@dataclass
class GroupingSummary:
    traitId: str
    method: Method
    nGroups: int
    scoreMetric: ScoreMetric
    scoreValue: float
    version: int
    updatedAt: str


@dataclass
class CultivarGroupAssignment:
    groupLabel: str
    probability: float
    confidence: Confidence
    borderline: bool
    indexScore: float


@dataclass
class TraitQuality:
    traitId: str
    nObserved: int
    nUsedInModel: int
    missingRate: float
    usable: bool
    note: str


@dataclass
class GroupingDocument:
    summary: GroupingSummary
    quality: TraitQuality
    assignments: dict  # {cultivarId: CultivarGroupAssignment}


@dataclass
class GroupingMeta:
    status: Status
    leaseExpiresAt: str | None
    completedAt: str
    version: int
    phenotypeHash: str


def to_firestore_dict(obj) -> dict:
    """Convert dataclass to Firestore-compatible dict."""
    if hasattr(obj, "__dataclass_fields__"):
        result = {}
        for k, v in asdict(obj).items():
            result[k] = v
        return result
    return obj

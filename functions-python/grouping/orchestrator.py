"""Orchestrate the full grouping pipeline for all traits."""

from datetime import datetime, timezone
from .models import (
    TraitMetadata,
    GroupingSummary,
    TraitQuality,
    GroupingDocument,
    CultivarGroupAssignment,
)
from .trait_metadata import TRAIT_METADATA
from .quality_check import check_quality
from .preprocess import preprocess_trait
from .gmm_cluster import fit_gmm
from .fixed_class import classify_blb
from .post_process import build_assignments


def run_grouping(cultivar_docs: list[dict], version: int) -> dict[str, GroupingDocument]:
    """
    Run the full grouping pipeline.
    Returns {traitId: GroupingDocument}.
    Input: cultivar_docs with '_id' field set to cultivarId.
    """
    results: dict[str, GroupingDocument] = {}
    now = datetime.now(timezone.utc).isoformat()

    for trait in TRAIT_METADATA:
        if trait.type == "binary":
            results[trait.traitId] = _run_binary(cultivar_docs, trait, version, now)
        else:
            results[trait.traitId] = _run_continuous(cultivar_docs, trait, version, now)

    return results


def _run_continuous(
    cultivar_docs: list[dict], trait: TraitMetadata, version: int, now: str
) -> GroupingDocument:
    X, ids_used, variance = preprocess_trait(cultivar_docs, trait)
    quality = check_quality(cultivar_docs, trait, len(ids_used), variance)

    if not quality.usable:
        return _unusable_document(trait, quality, version, now)

    labels, probs, score = fit_gmm(X)
    assignments = build_assignments(ids_used, labels, probs, X, trait)

    summary = GroupingSummary(
        traitId=trait.traitId,
        method="gmm",
        nGroups=len(set(labels.tolist())),
        scoreMetric="silhouette",
        scoreValue=score,
        version=version,
        updatedAt=now,
    )
    return GroupingDocument(summary=summary, quality=quality, assignments=_to_dict(assignments))


def _run_binary(
    cultivar_docs: list[dict], trait: TraitMetadata, version: int, now: str
) -> GroupingDocument:
    assignments = classify_blb(cultivar_docs)
    n_used = len(assignments)

    quality = check_quality(cultivar_docs, trait, n_used, variance=None)

    if not quality.usable:
        return _unusable_document(trait, quality, version, now)

    n_groups = len(set(a.groupLabel for a in assignments.values()))

    summary = GroupingSummary(
        traitId=trait.traitId,
        method="fixed-class",
        nGroups=n_groups,
        scoreMetric="none",
        scoreValue=0.0,
        version=version,
        updatedAt=now,
    )
    return GroupingDocument(summary=summary, quality=quality, assignments=_to_dict(assignments))


def _unusable_document(
    trait: TraitMetadata, quality: TraitQuality, version: int, now: str
) -> GroupingDocument:
    summary = GroupingSummary(
        traitId=trait.traitId,
        method="none",
        nGroups=0,
        scoreMetric="none",
        scoreValue=0.0,
        version=version,
        updatedAt=now,
    )
    return GroupingDocument(summary=summary, quality=quality, assignments={})


def _to_dict(assignments: dict[str, CultivarGroupAssignment]) -> dict:
    return {
        cid: {
            "groupLabel": a.groupLabel,
            "probability": a.probability,
            "confidence": a.confidence,
            "borderline": a.borderline,
            "indexScore": a.indexScore,
        }
        for cid, a in assignments.items()
    }

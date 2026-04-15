"""Post-processing: confidence detection + auto-naming."""

import numpy as np
from .models import CultivarGroupAssignment, TraitMetadata

HIGH_THRESHOLD = 0.85
MEDIUM_THRESHOLD = 0.65


def build_assignments(
    cultivar_ids: list[str],
    labels: np.ndarray,
    probs: np.ndarray,
    z_values: np.ndarray,
    trait: TraitMetadata,
) -> dict[str, CultivarGroupAssignment]:
    """Build final assignments with confidence and auto-named labels."""
    group_names = _auto_name_groups(labels, z_values, trait)

    assignments: dict[str, CultivarGroupAssignment] = {}
    for i, cid in enumerate(cultivar_ids):
        lbl = int(labels[i])
        prob = float(probs[i][lbl])
        confidence = _confidence_level(prob)
        assignments[cid] = CultivarGroupAssignment(
            groupLabel=group_names[lbl],
            probability=prob,
            confidence=confidence,
            borderline=(confidence == "borderline"),
            indexScore=float(z_values[i]),
        )
    return assignments


def _confidence_level(prob: float) -> str:
    if prob >= HIGH_THRESHOLD:
        return "high"
    if prob >= MEDIUM_THRESHOLD:
        return "medium"
    return "borderline"


def _auto_name_groups(
    labels: np.ndarray, z_values: np.ndarray, trait: TraitMetadata
) -> dict[int, str]:
    """Assign human-readable names based on trait direction and group means."""
    unique_labels = sorted(set(labels.tolist()))
    means = {}
    for lbl in unique_labels:
        mask = labels == lbl
        means[lbl] = float(np.mean(z_values[mask])) if mask.any() else 0.0

    # Sort labels by mean ascending
    sorted_labels = sorted(unique_labels, key=lambda l: means[l])

    # direction=higher-is-more → low mean = trait.labels.low, high mean = trait.labels.high
    if trait.direction == "higher-is-less":
        return {sorted_labels[0]: trait.labels["high"], sorted_labels[-1]: trait.labels["low"]}
    # higher-is-more or not-applicable (but binary doesn't use this path)
    return {sorted_labels[0]: trait.labels["low"], sorted_labels[-1]: trait.labels["high"]}

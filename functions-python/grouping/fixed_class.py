"""Fixed-class classifier for binary traits (BLB)."""

from .models import CultivarGroupAssignment


def classify_blb(cultivar_docs: list[dict]) -> dict[str, CultivarGroupAssignment]:
    """
    Classify cultivars into resistant/susceptible based on BLB data.
    Returns {cultivarId: assignment}. Missing data → no assignment.
    """
    assignments: dict[str, CultivarGroupAssignment] = {}
    for doc in cultivar_docs:
        cid = doc["_id"]
        resistance = doc.get("resistance", {}).get("bacterialLeafBlight")
        label = _classify(resistance)
        if label is None:
            continue
        assignments[cid] = CultivarGroupAssignment(
            groupLabel=label,
            probability=1.0,
            confidence="high",
            borderline=False,
            indexScore=1.0 if label == "resistant" else 0.0,
        )
    return assignments


def _classify(resistance) -> str | None:
    """Return 'resistant' / 'susceptible' / None."""
    if resistance is None:
        return None
    if isinstance(resistance, dict):
        keys = ["k1", "k2", "k3", "k3a"]
        vals = [resistance.get(k) for k in keys]
        # All null → missing
        if all(v is None for v in vals):
            return None
        # Any true → resistant
        if any(v is True for v in vals):
            return "resistant"
        return "susceptible"
    # Numeric summary
    if isinstance(resistance, (int, float)):
        return "resistant" if resistance >= 1 else "susceptible"
    return None

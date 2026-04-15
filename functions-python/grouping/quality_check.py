"""Data quality checker for trait grouping."""

from .models import TraitMetadata, TraitQuality

MIN_OBSERVED = 6
MAX_MISSING_RATE = 0.4
MIN_VARIANCE = 1e-6


def extract_values(cultivar_docs: list[dict], trait: TraitMetadata) -> list:
    """Extract raw values for the trait from all cultivar docs. Returns list with None for missing."""
    values = []
    for doc in cultivar_docs:
        val = _extract_trait_value(doc, trait)
        values.append(val)
    return values


def _extract_trait_value(doc: dict, trait: TraitMetadata):
    """Get the raw (possibly composite) value for one cultivar."""
    if trait.traitId == "heading_date":
        return doc.get("daysToHeading", {})
    if trait.traitId == "culm_length":
        return doc.get("morphology", {}).get("culmLength")
    if trait.traitId == "panicle_length":
        return doc.get("morphology", {}).get("panicleLength")
    if trait.traitId == "panicle_number":
        return doc.get("morphology", {}).get("panicleNumber")
    if trait.traitId == "spikelets_per_panicle":
        return doc.get("yield", {}).get("spikeletsPerPanicle")
    if trait.traitId == "ripening_rate":
        return doc.get("yield", {}).get("ripeningRate")
    if trait.traitId == "grain_weight":
        return doc.get("quality", {}).get("grainWeight")
    if trait.traitId == "pre_harvest_sprouting":
        return doc.get("quality", {}).get("preHarvestSprouting")
    if trait.traitId == "bacterial_leaf_blight":
        return doc.get("resistance", {}).get("bacterialLeafBlight")
    return None


def check_quality(
    cultivar_docs: list[dict],
    trait: TraitMetadata,
    n_used_in_model: int,
    variance: float | None,
) -> TraitQuality:
    """Evaluate whether a trait is usable for grouping."""
    n_total = len(cultivar_docs)
    values = extract_values(cultivar_docs, trait)

    n_observed = sum(1 for v in values if _is_present(v, trait))
    missing_rate = (n_total - n_observed) / n_total if n_total > 0 else 1.0

    usable = True
    note = ""

    if n_observed < MIN_OBSERVED:
        usable = False
        note = f"Only {n_observed} cultivars observed (min {MIN_OBSERVED})"
    elif n_used_in_model < MIN_OBSERVED:
        usable = False
        note = f"Only {n_used_in_model} usable rows after preprocessing"
    elif missing_rate > MAX_MISSING_RATE:
        usable = False
        note = f"Missing rate {missing_rate:.1%} exceeds {MAX_MISSING_RATE:.0%}"
    elif variance is not None and variance < MIN_VARIANCE:
        usable = False
        note = "Near-zero variance"

    return TraitQuality(
        traitId=trait.traitId,
        nObserved=n_observed,
        nUsedInModel=n_used_in_model,
        missingRate=missing_rate,
        usable=usable,
        note=note,
    )


def _is_present(value, trait: TraitMetadata) -> bool:
    """Check if a trait value counts as observed."""
    if value is None:
        return False
    if trait.type == "multi-env":
        # Dict with at least one non-null env
        if not isinstance(value, dict):
            return False
        return any(value.get(k) is not None for k in trait.keys)
    if trait.type == "binary":
        # BLB: dict with k1-k3a, or numeric summary
        if isinstance(value, dict):
            return any(value.get(k) is not None for k in trait.keys)
        return value is not None
    # single-continuous
    return isinstance(value, (int, float))

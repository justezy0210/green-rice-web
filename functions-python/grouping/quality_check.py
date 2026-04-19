"""Data quality checker for trait grouping.

Trait-id dispatch uses the `EXTRACTORS` registry so adding a trait to
data/traits.json fails the build (test_quality_check_registry.py) until
a matching extractor is registered here.
"""

from typing import Callable

from .models import TraitMetadata, TraitQuality

MIN_OBSERVED = 6
MAX_MISSING_RATE = 0.4
MIN_VARIANCE = 1e-6


def extract_values(cultivar_docs: list[dict], trait: TraitMetadata) -> list:
    """Extract raw values for the trait from all cultivar docs. Returns list with None for missing."""
    extractor = EXTRACTORS.get(trait.traitId)
    if extractor is None:
        return [None] * len(cultivar_docs)
    return [extractor(doc) for doc in cultivar_docs]


def _heading_date(doc: dict):
    return doc.get("daysToHeading", {})


def _culm_length(doc: dict):
    return doc.get("morphology", {}).get("culmLength")


def _panicle_length(doc: dict):
    return doc.get("morphology", {}).get("panicleLength")


def _panicle_number(doc: dict):
    return doc.get("morphology", {}).get("panicleNumber")


def _spikelets_per_panicle(doc: dict):
    return doc.get("yield", {}).get("spikeletsPerPanicle")


def _ripening_rate(doc: dict):
    return doc.get("yield", {}).get("ripeningRate")


def _grain_weight(doc: dict):
    return doc.get("quality", {}).get("grainWeight")


def _pre_harvest_sprouting(doc: dict):
    return doc.get("quality", {}).get("preHarvestSprouting")


def _bacterial_leaf_blight(doc: dict):
    return doc.get("resistance", {}).get("bacterialLeafBlight")


EXTRACTORS: dict[str, Callable[[dict], object]] = {
    "heading_date": _heading_date,
    "culm_length": _culm_length,
    "panicle_length": _panicle_length,
    "panicle_number": _panicle_number,
    "spikelets_per_panicle": _spikelets_per_panicle,
    "ripening_rate": _ripening_rate,
    "grain_weight": _grain_weight,
    "pre_harvest_sprouting": _pre_harvest_sprouting,
    "bacterial_leaf_blight": _bacterial_leaf_blight,
}


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

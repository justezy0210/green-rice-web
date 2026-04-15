"""Trait metadata registry. Must match src/types/grouping.ts FIELD_TO_TRAIT_ID."""

from .models import TraitMetadata

TRAIT_METADATA: list[TraitMetadata] = [
    TraitMetadata(
        traitId="heading_date",
        type="multi-env",
        keys=["early", "normal", "late"],
        direction="higher-is-more",
        labels={"low": "early", "high": "late"},
        unit="days",
    ),
    TraitMetadata(
        traitId="culm_length",
        type="single-continuous",
        keys=["culmLength"],
        direction="higher-is-more",
        labels={"low": "short", "high": "tall"},
        unit="cm",
    ),
    TraitMetadata(
        traitId="panicle_length",
        type="single-continuous",
        keys=["panicleLength"],
        direction="higher-is-more",
        labels={"low": "short", "high": "long"},
        unit="cm",
    ),
    TraitMetadata(
        traitId="panicle_number",
        type="single-continuous",
        keys=["panicleNumber"],
        direction="higher-is-more",
        labels={"low": "low", "high": "high"},
        unit="",
    ),
    TraitMetadata(
        traitId="spikelets_per_panicle",
        type="single-continuous",
        keys=["spikeletsPerPanicle"],
        direction="higher-is-more",
        labels={"low": "low", "high": "high"},
        unit="",
    ),
    TraitMetadata(
        traitId="ripening_rate",
        type="single-continuous",
        keys=["ripeningRate"],
        direction="higher-is-more",
        labels={"low": "low", "high": "high"},
        unit="%",
    ),
    TraitMetadata(
        traitId="grain_weight",
        type="single-continuous",
        keys=["grainWeight1000"],
        direction="higher-is-more",
        labels={"low": "light", "high": "heavy"},
        unit="g",
    ),
    TraitMetadata(
        traitId="pre_harvest_sprouting",
        type="single-continuous",
        keys=["preHarvestSprouting"],
        direction="higher-is-more",
        labels={"low": "low", "high": "high"},
        unit="%",
    ),
    TraitMetadata(
        traitId="bacterial_leaf_blight",
        type="binary",
        keys=["k1", "k2", "k3", "k3a"],
        direction="not-applicable",
        labels={"low": "susceptible", "high": "resistant"},
        unit="",
    ),
]


def get_trait(trait_id: str) -> TraitMetadata | None:
    for t in TRAIT_METADATA:
        if t.traitId == trait_id:
            return t
    return None

"""Guard: manifest-driven TRAIT_METADATA must equal the pre-migration snapshot.

Purpose: detect accidental semantic drift introduced via data/traits.json.
If this test fails, either the manifest was edited on purpose (update the
snapshot here) or the manifest was edited by mistake (revert).
"""

from grouping.trait_metadata import TRAIT_METADATA
from grouping.models import TraitMetadata


PRE_MIGRATION_SNAPSHOT: list[TraitMetadata] = [
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


def test_runtime_matches_pre_migration_snapshot():
    assert TRAIT_METADATA == PRE_MIGRATION_SNAPSHOT

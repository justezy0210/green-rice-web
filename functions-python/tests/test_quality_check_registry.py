"""Ensure quality_check.EXTRACTORS covers every registered trait id."""

from grouping.quality_check import EXTRACTORS
from shared.traits import TRAIT_IDS


def test_extractor_keys_match_trait_ids():
    assert set(EXTRACTORS.keys()) == TRAIT_IDS


def test_extractor_dispatch_returns_nested_value():
    # Sanity check a couple of representative extractors
    doc = {
        "daysToHeading": {"early": 80},
        "morphology": {"culmLength": 90.0},
        "resistance": {"bacterialLeafBlight": "resistant"},
    }
    assert EXTRACTORS["heading_date"](doc) == {"early": 80}
    assert EXTRACTORS["culm_length"](doc) == 90.0
    assert EXTRACTORS["bacterial_leaf_blight"](doc) == "resistant"

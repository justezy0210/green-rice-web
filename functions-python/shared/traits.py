"""Trait registry loaded from generated_manifests/traits.json.

The runtime shape is `grouping.models.TraitMetadata` — this module adapts
the manifest into that dataclass so existing consumers do not need to
change. `EXTRACTORS` dispatch lives in `grouping.quality_check`, not here;
`traits.py` is pure registry data.
"""

from grouping.models import TraitMetadata

from .manifests import load_traits


def _build_traits() -> list[TraitMetadata]:
    return [
        TraitMetadata(
            traitId=entry["id"],
            type=entry["type"],
            keys=list(entry["keys"]),
            direction=entry["direction"],
            labels=dict(entry["labels"]),
            unit=entry["unit"],
        )
        for entry in load_traits()
    ]


TRAITS: list[TraitMetadata] = _build_traits()
TRAIT_IDS: set[str] = {t.traitId for t in TRAITS}

_BY_ID = {t.traitId: t for t in TRAITS}


def get_trait(trait_id: str) -> TraitMetadata | None:
    return _BY_ID.get(trait_id)


def is_trait_id(v: str) -> bool:
    return v in TRAIT_IDS

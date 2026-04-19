"""Trait metadata registry — loaded from the cross-language manifest.

Canonical source: data/traits.json (via functions-python/shared/traits.py).
See docs/exec-plans/active/2026-04-19-ssot-tier3-cross-language-manifest.md.
"""

from shared.traits import TRAITS, get_trait

TRAIT_METADATA = TRAITS

__all__ = ["TRAIT_METADATA", "get_trait"]

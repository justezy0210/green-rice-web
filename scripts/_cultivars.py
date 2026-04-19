"""Shared cultivar list loader. Reads data/cultivars.json at project root."""

import json
from pathlib import Path

_DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "cultivars.json"


def _load():
    with open(_DATA_PATH) as f:
        return json.load(f)


def all_cultivars() -> list[str]:
    """All 16 cultivars, stable ordered."""
    return [c["id"] for c in _load()["cultivars"]]


def pangenome_cultivars() -> list[str]:
    """Cultivars included in the Cactus pangenome (11 of 16)."""
    return [c["id"] for c in _load()["cultivars"] if c.get("pangenome")]

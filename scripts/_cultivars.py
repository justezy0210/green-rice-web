"""Shared cultivar list loader. Reads data/cultivars.json at project root.

Parallel SSOT to src/config/panel.ts — both sides read the same JSON so counts
never drift. IRGSP reference identifiers live in `_reference.py`.
"""

import json
from pathlib import Path

_DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "cultivars.json"


def _load():
    with open(_DATA_PATH) as f:
        return json.load(f)


def all_cultivars() -> list[str]:
    """Every cultivar in the panel, stable ordered."""
    return [c["id"] for c in _load()["cultivars"]]


def pangenome_cultivars() -> list[str]:
    """Cultivars included in the Cactus pangenome alignment."""
    return [c["id"] for c in _load()["cultivars"] if c.get("pangenome")]


def total_cultivars() -> int:
    return len(all_cultivars())


def pangenome_count() -> int:
    return len(pangenome_cultivars())

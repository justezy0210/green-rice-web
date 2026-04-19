"""Low-level manifest loaders for functions-python/generated_manifests/.

Stdlib only. Raises `ManifestError` on missing files, missing required
fields, or disallowed enum values. Caller-level modules (`traits.py`,
`reference.py`) wrap these into domain types.
"""

import json
from pathlib import Path
from typing import Any

_MANIFESTS_DIR = Path(__file__).resolve().parent.parent / "generated_manifests"


class ManifestError(ValueError):
    """Raised when a manifest file is missing or fails structural checks."""


def _load(name: str) -> Any:
    path = _MANIFESTS_DIR / name
    if not path.exists():
        raise ManifestError(
            f"Manifest not found: {path}. "
            "Run `npm run sync:manifests` to regenerate deploy copies."
        )
    with open(path) as f:
        return json.load(f)


_TRAIT_REQUIRED_FIELDS = {"id", "label", "type", "keys", "direction", "labels", "unit"}
_TRAIT_TYPES = {"multi-env", "single-continuous", "binary"}
_TRAIT_DIRECTIONS = {"higher-is-more", "higher-is-less", "not-applicable"}


def load_traits() -> list[dict]:
    raw = _load("traits.json")
    entries = raw.get("traits")
    if not isinstance(entries, list):
        raise ManifestError("traits.json: missing or non-list `traits`")

    seen_ids: set[str] = set()
    for i, e in enumerate(entries):
        if not isinstance(e, dict):
            raise ManifestError(f"traits.json: entry {i} is not an object")
        missing = _TRAIT_REQUIRED_FIELDS - e.keys()
        if missing:
            raise ManifestError(f"traits.json: entry {i} missing fields: {sorted(missing)}")
        if e["type"] not in _TRAIT_TYPES:
            raise ManifestError(f"traits.json: entry {i} has unknown type {e['type']!r}")
        if e["direction"] not in _TRAIT_DIRECTIONS:
            raise ManifestError(f"traits.json: entry {i} has unknown direction {e['direction']!r}")
        labels = e["labels"]
        if not isinstance(labels, dict) or "low" not in labels or "high" not in labels:
            raise ManifestError(f"traits.json: entry {i} labels must have 'low' and 'high'")
        if not isinstance(e["keys"], list) or not e["keys"]:
            raise ManifestError(f"traits.json: entry {i} keys must be a non-empty list")
        if e["id"] in seen_ids:
            raise ManifestError(f"traits.json: duplicate trait id {e['id']!r}")
        seen_ids.add(e["id"])

    return entries


_REFERENCE_REQUIRED_FIELDS = {"sampleId", "displayName", "longName"}


def load_reference() -> dict:
    raw = _load("reference.json")
    missing = _REFERENCE_REQUIRED_FIELDS - raw.keys()
    if missing:
        raise ManifestError(f"reference.json missing fields: {sorted(missing)}")
    for k in _REFERENCE_REQUIRED_FIELDS:
        if not isinstance(raw[k], str) or not raw[k]:
            raise ManifestError(f"reference.json: {k!r} must be a non-empty string")
    return raw


_DOWNLOAD_VERSIONS_REQUIRED_FIELDS = {
    "activeOrthofinderVersion",
    "activeGroupingVersion",
    "updatedAt",
}


def load_download_versions() -> dict:
    raw = _load("download_versions.json")
    missing = _DOWNLOAD_VERSIONS_REQUIRED_FIELDS - raw.keys()
    if missing:
        raise ManifestError(f"download_versions.json missing fields: {sorted(missing)}")
    for field in ("activeOrthofinderVersion", "activeGroupingVersion"):
        value = raw[field]
        if not isinstance(value, int) or value <= 0:
            raise ManifestError(
                f"download_versions.json: {field!r} must be a positive integer, got {value!r}"
            )
    if not isinstance(raw["updatedAt"], str):
        raise ManifestError("download_versions.json: updatedAt must be a string")
    return raw


_CULTIVAR_REQUIRED_FIELDS = {"id"}


def load_cultivars() -> list[dict]:
    raw = _load("cultivars.json")
    entries = raw.get("cultivars")
    if not isinstance(entries, list) or not entries:
        raise ManifestError("cultivars.json: missing or empty `cultivars`")
    for i, e in enumerate(entries):
        if not isinstance(e, dict):
            raise ManifestError(f"cultivars.json: entry {i} is not an object")
        missing = _CULTIVAR_REQUIRED_FIELDS - e.keys()
        if missing:
            raise ManifestError(f"cultivars.json: entry {i} missing fields: {sorted(missing)}")
        if not isinstance(e["id"], str):
            raise ManifestError(f"cultivars.json: entry {i} id must be a string")
    return entries

"""Loader tests for the cross-language manifests."""

import json
from pathlib import Path

import pytest

from shared.manifests import (
    ManifestError,
    _MANIFESTS_DIR,
    load_cultivars,
    load_reference,
    load_traits,
)


def test_traits_loads_cleanly():
    traits = load_traits()
    assert len(traits) >= 1
    for t in traits:
        assert t["type"] in {"multi-env", "single-continuous", "binary"}
        assert t["direction"] in {"higher-is-more", "higher-is-less", "not-applicable"}


def test_reference_loads_cleanly():
    ref = load_reference()
    assert ref["sampleId"]
    assert ref["displayName"]
    assert ref["longName"]


def test_cultivars_loads_cleanly():
    cultivars = load_cultivars()
    assert len(cultivars) >= 1
    assert all(isinstance(c["id"], str) for c in cultivars)


def _write_tmp_manifest(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, name: str, content):
    tmp_dir = tmp_path / "generated_manifests"
    tmp_dir.mkdir()
    # Copy the real manifests so only `name` is the broken one
    for real in _MANIFESTS_DIR.glob("*.json"):
        (tmp_dir / real.name).write_bytes(real.read_bytes())
    path = tmp_dir / name
    path.write_text(json.dumps(content))
    monkeypatch.setattr("shared.manifests._MANIFESTS_DIR", tmp_dir)


def test_traits_rejects_duplicate_id(tmp_path, monkeypatch):
    dup = {
        "traits": [
            {
                "id": "heading_date",
                "label": "x",
                "type": "multi-env",
                "keys": ["a"],
                "direction": "higher-is-more",
                "labels": {"low": "l", "high": "h"},
                "unit": "",
            },
            {
                "id": "heading_date",
                "label": "x",
                "type": "multi-env",
                "keys": ["a"],
                "direction": "higher-is-more",
                "labels": {"low": "l", "high": "h"},
                "unit": "",
            },
        ]
    }
    _write_tmp_manifest(tmp_path, monkeypatch, "traits.json", dup)
    with pytest.raises(ManifestError, match="duplicate trait id"):
        load_traits()


def test_traits_rejects_unknown_direction(tmp_path, monkeypatch):
    bad = {
        "traits": [
            {
                "id": "x",
                "label": "x",
                "type": "multi-env",
                "keys": ["a"],
                "direction": "sideways",
                "labels": {"low": "l", "high": "h"},
                "unit": "",
            }
        ]
    }
    _write_tmp_manifest(tmp_path, monkeypatch, "traits.json", bad)
    with pytest.raises(ManifestError, match="unknown direction"):
        load_traits()


def test_traits_rejects_missing_field(tmp_path, monkeypatch):
    bad = {"traits": [{"id": "x"}]}
    _write_tmp_manifest(tmp_path, monkeypatch, "traits.json", bad)
    with pytest.raises(ManifestError, match="missing fields"):
        load_traits()


def test_reference_rejects_missing_field(tmp_path, monkeypatch):
    bad = {"sampleId": "IRGSP-1"}
    _write_tmp_manifest(tmp_path, monkeypatch, "reference.json", bad)
    with pytest.raises(ManifestError, match="missing fields"):
        load_reference()


def test_missing_manifest_file(tmp_path, monkeypatch):
    tmp_dir = tmp_path / "empty"
    tmp_dir.mkdir()
    monkeypatch.setattr("shared.manifests._MANIFESTS_DIR", tmp_dir)
    with pytest.raises(ManifestError, match="not found"):
        load_traits()

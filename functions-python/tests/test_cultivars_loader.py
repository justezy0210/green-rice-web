"""Minimum guarantees on cultivars manifest."""

from shared.manifests import load_cultivars


def test_cultivar_ids_are_unique_strings():
    entries = load_cultivars()
    ids = [c["id"] for c in entries]
    assert all(isinstance(i, str) and i for i in ids)
    assert len(set(ids)) == len(ids)


def test_at_least_one_pangenome_cultivar():
    entries = load_cultivars()
    assert any(c.get("pangenome") for c in entries)

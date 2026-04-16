"""Tests for orthofinder.diff — metadata/payload split + write order."""

from unittest.mock import MagicMock

import pytest

from orthofinder.diff import (
    FALLBACK_TOP_N,
    compute_diff_for_trait,
    write_diff_artifacts,
)
from orthofinder.models import diff_storage_path


def _assignment(group: str, score: float, borderline: bool = False) -> dict:
    return {"groupLabel": group, "indexScore": score, "borderline": borderline}


def _make_matrix(counts_by_og: dict[str, list[int]], cultivar_ids: list[str]) -> dict:
    return {
        og: {cid: counts[i] for i, cid in enumerate(cultivar_ids)}
        for og, counts in counts_by_og.items()
    }


def test_compute_returns_meta_and_payload_consistent():
    cultivars = ["a", "b", "c", "d"]
    assignments = {
        "a": _assignment("low", 0.1),
        "b": _assignment("low", 0.2),
        "c": _assignment("high", 0.8),
        "d": _assignment("high", 0.9),
    }
    # 6 OGs, one with strong signal, rest noisy
    matrix = _make_matrix(
        {
            "OG0000000": [0, 0, 5, 5],   # clear high-only
            "OG0000001": [0, 1, 4, 5],   # also separates
            "OG0000002": [2, 2, 2, 2],   # constant — NaN p
            "OG0000003": [1, 0, 3, 4],
            "OG0000004": [0, 0, 2, 3],
            "OG0000005": [1, 1, 1, 2],   # tiny diff
        },
        cultivars,
    )

    result = compute_diff_for_trait(
        trait_id="T1",
        grouping_assignments=assignments,
        matrix=matrix,
        og_descriptions={
            "OG0000000": {"transcripts": ["Os01t0001-00"], "descriptions": {"Os01t0001-00": "Kinase"}},
        },
        grouping_version=3,
        orthofinder_version=7,
    )
    assert result is not None
    meta, payload = result

    # Metadata shape
    assert meta.traitId == "T1"
    assert meta.orthofinderVersion == 7
    assert meta.groupingVersion == 3
    assert meta.storagePath == diff_storage_path(7, 3, "T1")
    assert meta.schemaVersion == 1

    # Payload shape & consistency
    assert payload.entryCount == len(payload.entries)
    assert meta.entryCount == payload.entryCount
    assert meta.passedCount == payload.passedCount
    assert meta.selectionMode == payload.selectionMode
    assert meta.computedAt == payload.computedAt

    # totalTested counts valid MWU rows (constant rows may or may not produce NaN p
    # depending on scipy version; allow either outcome)
    assert meta.totalTested in (5, 6)

    # Representative attached when og_descriptions has data
    og0 = next((e for e in payload.entries if e.orthogroup == "OG0000000"), None)
    if og0 is not None:
        assert og0.representative is not None
        assert og0.representative.source == "irgsp"
        assert og0.representative.transcripts == ["Os01t0001-00"]


def test_fallback_mode_entry_count_may_differ_from_passed_count():
    """top_n_fallback: show top N by p-value regardless of cutoff; passedCount counts only relaxed hits."""
    cultivars = ["a", "b", "c"]
    assignments = {
        "a": _assignment("low", 0.1),
        "b": _assignment("high", 0.9),
        "c": _assignment("high", 0.95),
    }
    # With n1=1 and n2=2, MWU p-values are bounded well above 0.05 — forcing fallback.
    matrix = _make_matrix(
        {f"OG{i:07d}": [i % 3, (i + 1) % 3, (i + 2) % 3] for i in range(20)},
        cultivars,
    )

    result = compute_diff_for_trait(
        trait_id="Tfb",
        grouping_assignments=assignments,
        matrix=matrix,
        og_descriptions={},
        grouping_version=1,
        orthofinder_version=1,
    )
    assert result is not None
    meta, payload = result
    if meta.selectionMode == "top_n_fallback":
        assert payload.entryCount <= FALLBACK_TOP_N
        # passedCount may be smaller than (or equal to) entryCount in fallback
        assert payload.passedCount <= payload.entryCount


def test_write_artifacts_storage_before_firestore():
    """Storage upload must precede Firestore write so failed uploads leave prior doc intact."""
    call_log: list[str] = []

    class FakeUploader:
        @staticmethod
        def upload_json(path: str, obj: dict) -> None:
            call_log.append(f"storage:{path}")

    fake_db = MagicMock()
    doc_ref = fake_db.collection.return_value.document.return_value

    def record_set(_payload):
        call_log.append("firestore:set")

    doc_ref.set.side_effect = record_set

    from orthofinder.models import (
        OrthogroupDiffDocument,
        OrthogroupDiffPayload,
    )

    meta = OrthogroupDiffDocument(
        traitId="T",
        groupLabels=["a", "b"],
        selectionMode="strict",
        thresholds={"pValue": 0.05, "meanDiff": 0.5},
        totalTested=10,
        passedCount=3,
        entryCount=3,
        computedAt="2026-04-16T00:00:00Z",
        groupingVersion=1,
        orthofinderVersion=1,
        storagePath="orthogroup_diffs/v1/g1/T.json",
    )
    payload = OrthogroupDiffPayload(
        traitId="T",
        groupLabels=["a", "b"],
        entries=[],
        entryCount=3,
        passedCount=3,
        selectionMode="strict",
        thresholds={"pValue": 0.05, "meanDiff": 0.5},
        computedAt="2026-04-16T00:00:00Z",
        groupingVersion=1,
        orthofinderVersion=1,
    )

    write_diff_artifacts(fake_db, FakeUploader, meta, payload)

    assert call_log == [
        f"storage:{meta.storagePath}",
        "firestore:set",
    ]


def test_write_artifacts_firestore_untouched_when_storage_fails():
    fake_db = MagicMock()
    doc_ref = fake_db.collection.return_value.document.return_value

    class BrokenUploader:
        @staticmethod
        def upload_json(path: str, obj: dict) -> None:
            raise RuntimeError("storage down")

    from orthofinder.models import (
        OrthogroupDiffDocument,
        OrthogroupDiffPayload,
    )

    meta = OrthogroupDiffDocument(
        traitId="T",
        groupLabels=["a", "b"],
        selectionMode="strict",
        thresholds={"pValue": 0.05, "meanDiff": 0.5},
        totalTested=10,
        passedCount=3,
        entryCount=3,
        computedAt="2026-04-16T00:00:00Z",
        groupingVersion=1,
        orthofinderVersion=1,
        storagePath="orthogroup_diffs/v1/g1/T.json",
    )
    payload = OrthogroupDiffPayload(
        traitId="T",
        groupLabels=["a", "b"],
        entries=[],
        entryCount=3,
        passedCount=3,
        selectionMode="strict",
        thresholds={"pValue": 0.05, "meanDiff": 0.5},
        computedAt="2026-04-16T00:00:00Z",
        groupingVersion=1,
        orthofinderVersion=1,
    )

    with pytest.raises(RuntimeError):
        write_diff_artifacts(fake_db, BrokenUploader, meta, payload)

    doc_ref.set.assert_not_called()


def test_diff_storage_path_is_immutable_versioned():
    assert diff_storage_path(5, 2, "plant_height") == "orthogroup_diffs/v5/g2/plant_height.json"

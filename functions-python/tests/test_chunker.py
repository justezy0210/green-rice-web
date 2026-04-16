"""Tests for orthofinder.chunker — StreamingChunkWriter."""

import pytest

from orthofinder.chunker import StreamingChunkWriter


class _FakeUploader:
    """Captures upload_json calls instead of writing to Storage."""

    def __init__(self):
        self.uploads: dict[str, dict] = {}

    def upload_json(self, path: str, obj: dict) -> None:
        # Shallow copy so buffer mutations after flush don't affect our record
        self.uploads[path] = {"chunk": obj["chunk"], "ogs": dict(obj["ogs"])}


def test_chunk_key_basic():
    assert StreamingChunkWriter.chunk_key("OG0000000") == "000"
    assert StreamingChunkWriter.chunk_key("OG0000999") == "000"
    assert StreamingChunkWriter.chunk_key("OG0001000") == "001"
    assert StreamingChunkWriter.chunk_key("OG0012345") == "012"
    assert StreamingChunkWriter.chunk_key("OG0053329") == "053"


def test_chunk_key_invalid_format():
    with pytest.raises(ValueError):
        StreamingChunkWriter.chunk_key("NotAnOG")
    with pytest.raises(ValueError):
        StreamingChunkWriter.chunk_key("OGabc")


def test_writer_flush_all_writes_pending_chunks():
    fake = _FakeUploader()
    writer = StreamingChunkWriter(version=7, uploader_module=fake)
    writer.add("OG0000000", {"baegilmi": ["g1"]})
    writer.add("OG0000001", {"ilmi": ["g2"]})
    writer.add("OG0001000", {"samgwang": ["g3"]})

    n = writer.flush_all()
    assert n == 2  # chunks 000 and 001

    assert "orthofinder/v7/og-members/chunk_000.json" in fake.uploads
    assert "orthofinder/v7/og-members/chunk_001.json" in fake.uploads

    chunk000 = fake.uploads["orthofinder/v7/og-members/chunk_000.json"]
    assert chunk000["chunk"] == "000"
    assert chunk000["ogs"] == {
        "OG0000000": {"baegilmi": ["g1"]},
        "OG0000001": {"ilmi": ["g2"]},
    }


def test_writer_auto_flushes_when_chunk_full():
    """Reaching CHUNK_SIZE within the same chunk key triggers an immediate flush.

    Uses a subclass instead of monkeypatch so the class attribute change is
    unambiguously scoped to this test instance.
    """
    class SmallWriter(StreamingChunkWriter):
        CHUNK_SIZE = 3

    fake = _FakeUploader()
    writer = SmallWriter(version=2, uploader_module=fake)

    writer.add("OG0000000", {"a": ["g"]})
    writer.add("OG0000001", {"a": ["g"]})
    assert "orthofinder/v2/og-members/chunk_000.json" not in fake.uploads

    writer.add("OG0000002", {"a": ["g"]})  # reaches CHUNK_SIZE=3 → auto-flush
    assert "orthofinder/v2/og-members/chunk_000.json" in fake.uploads
    snapshot_after_auto = fake.uploads["orthofinder/v2/og-members/chunk_000.json"]
    assert set(snapshot_after_auto["ogs"].keys()) == {
        "OG0000000", "OG0000001", "OG0000002",
    }


def test_writer_routes_ogs_to_correct_chunk():
    """OGs are routed to chunks based on (og_number // CHUNK_SIZE)."""
    class SmallWriter(StreamingChunkWriter):
        CHUNK_SIZE = 2

    fake = _FakeUploader()
    writer = SmallWriter(version=3, uploader_module=fake)
    # OG0000000, OG0000001 → chunk "000" (auto-flushed when buffer hits size 2)
    # OG0000002, OG0000003 → chunk "001"
    for og in ["OG0000000", "OG0000001", "OG0000002", "OG0000003"]:
        writer.add(og, {"a": ["g"]})
    writer.flush_all()

    chunk000 = fake.uploads["orthofinder/v3/og-members/chunk_000.json"]
    chunk001 = fake.uploads["orthofinder/v3/og-members/chunk_001.json"]
    assert set(chunk000["ogs"].keys()) == {"OG0000000", "OG0000001"}
    assert set(chunk001["ogs"].keys()) == {"OG0000002", "OG0000003"}


def test_writer_flush_all_empty_is_noop():
    fake = _FakeUploader()
    writer = StreamingChunkWriter(version=1, uploader_module=fake)
    assert writer.flush_all() == 0
    assert fake.uploads == {}

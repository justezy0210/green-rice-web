"""
Streaming chunk writer for orthogroup gene-member artifacts.

Keeps memory bounded at ~CHUNK_SIZE rows regardless of total input size.
Chunks are keyed by OG number // CHUNK_SIZE (3-digit zero-padded):
  OG0000000 - OG0000999 → chunk "000"
  OG0001000 - OG0001999 → chunk "001"
  ...

Produces files at `orthofinder/v{version}/og-members/chunk_{key}.json`.
"""

import re


class StreamingChunkWriter:
    CHUNK_SIZE = 1000
    _OG_ID_RE = re.compile(r"^OG(\d+)$")

    def __init__(self, version: int, uploader_module):
        """
        version: orthofinder active version (int)
        uploader_module: module exposing upload_json(path, obj)
        """
        self.version = version
        self.uploader = uploader_module
        self._buffers: dict[str, dict[str, dict[str, list[str]]]] = {}

    def add(self, og_id: str, members: dict[str, list[str]]) -> None:
        """Buffer one OG's members; flush the chunk if it reaches CHUNK_SIZE."""
        chunk_key = self.chunk_key(og_id)
        buf = self._buffers.setdefault(chunk_key, {})
        buf[og_id] = members
        if len(buf) >= self.CHUNK_SIZE:
            self._flush(chunk_key)

    def flush_all(self) -> int:
        """Flush every buffered chunk. Returns total chunks written."""
        keys = list(self._buffers.keys())
        count = 0
        for k in keys:
            if self._buffers[k]:
                self._flush(k)
                count += 1
        return count

    def _flush(self, chunk_key: str) -> None:
        path = f"orthofinder/v{self.version}/og-members/chunk_{chunk_key}.json"
        data = {
            "chunk": chunk_key,
            "ogs": self._buffers[chunk_key],
        }
        self.uploader.upload_json(path, data)
        self._buffers[chunk_key] = {}

    @classmethod
    def chunk_key(cls, og_id: str) -> str:
        """OG0012345 → '012' (floor(12345 / 1000), zero-padded to 3 digits)."""
        m = cls._OG_ID_RE.match(og_id)
        if not m:
            raise ValueError(f"Invalid orthogroup id: {og_id}")
        num = int(m.group(1))
        return f"{num // cls.CHUNK_SIZE:03d}"

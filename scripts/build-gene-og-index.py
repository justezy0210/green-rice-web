#!/usr/bin/env python3
"""Build a gene → orthogroup reverse index from existing og-members chunks.

Reads:
  orthofinder/v{N}/og-members/chunk_{000..}.json   (Firebase Storage)

Writes:
  gene_index/v{N}/by_prefix/{PREFIX}.json          — partitioned reverse entries
  gene_index/v{N}/_manifest.json                   — prefix list, counts, stats

Each partition file:
  { "version": N, "prefix": "PR", "entries": { "<gene_id>": { "og": "OG000...", "cultivar": "..." }, ... } }

Partition key = first 2 uppercase alphanumeric chars of gene_id.
Partitions are small enough to lazy-load from the web client.

Usage:
  python3 scripts/build-gene-og-index.py --version 6
  python3 scripts/build-gene-og-index.py --version 6 --dry-run
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from collections import defaultdict
from pathlib import Path

BUCKET = "green-rice-db.firebasestorage.app"
PROJECT_ROOT = Path(__file__).resolve().parent.parent


def init_firebase():
    import firebase_admin
    from firebase_admin import credentials, storage
    sa = PROJECT_ROOT / "service-account.json"
    if not sa.exists():
        raise SystemExit("service-account.json missing at repo root.")
    try:
        firebase_admin.get_app()
    except ValueError:
        firebase_admin.initialize_app(credentials.Certificate(str(sa)),
                                      {"storageBucket": BUCKET})
    return storage.bucket()


def prefix_for_gene_id(gene_id: str) -> str:
    """First two alphanumeric chars, uppercased. Everything else → '__'."""
    s = re.sub(r"[^A-Za-z0-9]", "", gene_id)[:2].upper()
    return s if len(s) == 2 else "__"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--version", type=int, required=True,
                    help="OrthoFinder version (e.g., 6)")
    ap.add_argument("--dry-run", action="store_true",
                    help="Build locally, do not upload")
    args = ap.parse_args()
    v = args.version

    bucket = init_firebase()

    # 1. Enumerate chunk files
    chunk_blobs = sorted(
        bucket.list_blobs(prefix=f"orthofinder/v{v}/og-members/"),
        key=lambda b: b.name,
    )
    chunk_blobs = [b for b in chunk_blobs if b.name.endswith(".json")
                   and "chunk_" in b.name]
    if not chunk_blobs:
        raise SystemExit(f"No og-members chunks found for v{v}")
    print(f"v{v}: found {len(chunk_blobs)} og-members chunks")

    # 2. Walk chunks → reverse entries
    partitions: dict[str, dict[str, dict]] = defaultdict(dict)
    total_genes = 0
    start = time.time()
    for i, blob in enumerate(chunk_blobs, 1):
        payload = json.loads(blob.download_as_bytes())
        ogs = payload.get("ogs", {})
        for og_id, by_cultivar in ogs.items():
            for cultivar, genes in by_cultivar.items():
                for gene_id in genes:
                    partitions[prefix_for_gene_id(gene_id)][gene_id] = {
                        "og": og_id,
                        "cultivar": cultivar,
                    }
                    total_genes += 1
        if i % 5 == 0 or i == len(chunk_blobs):
            print(f"  chunk {i}/{len(chunk_blobs)} · genes so far {total_genes}")

    elapsed = time.time() - start
    print(f"Reverse index built: {total_genes} gene rows, "
          f"{len(partitions)} partitions · {elapsed:.1f}s")

    # 3. Build manifest
    manifest = {
        "schemaVersion": 1,
        "orthofinderVersion": v,
        "builtAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "totalGenes": total_genes,
        "partitions": {
            pfx: {
                "path": f"gene_index/v{v}/by_prefix/{pfx}.json",
                "geneCount": len(entries),
            }
            for pfx, entries in sorted(partitions.items())
        },
    }

    # 4. Upload (or local dump on dry-run)
    def _upload(path: str, body: dict) -> int:
        data = json.dumps(body, separators=(",", ":")).encode("utf-8")
        if args.dry_run:
            out = PROJECT_ROOT / "tmp" / path
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_bytes(data)
            return len(data)
        blob = bucket.blob(path)
        blob.upload_from_string(data, content_type="application/json; charset=utf-8")
        blob.cache_control = "public, max-age=3600"
        blob.patch()
        return len(data)

    total_bytes = 0
    for pfx, entries in sorted(partitions.items()):
        body = {"version": v, "prefix": pfx, "entries": entries}
        n = _upload(f"gene_index/v{v}/by_prefix/{pfx}.json", body)
        total_bytes += n
    mb = _upload(f"gene_index/v{v}/_manifest.json", manifest)
    total_bytes += mb

    mode = "dry-run (tmp/)" if args.dry_run else "uploaded"
    print(f"{mode}: {len(partitions) + 1} files, "
          f"{total_bytes / 1024 / 1024:.1f} MB total")
    return 0


if __name__ == "__main__":
    sys.exit(main())

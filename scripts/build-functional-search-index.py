#!/usr/bin/env python3
"""Build a compact functional search index from gene_models + gene_index.

Reads (from Firebase Storage, already populated):
  gene_models/v{N}/by_prefix/*.json      — exon + annotation
  gene_index/v{N}/by_prefix/*.json       — transcript→OG reverse map

Writes (uploaded or local dry-run):
  functional_index/v{N}/index.json       — single-file Phase-1 MVP

Schema (see docs/exec-plans/active/*functional-search):
  {
    "schemaVersion": 1,
    "orthofinderVersion": N,
    "builtAt": "...",
    "annotatedCultivars": [...],
    "rows": [
      { "g": geneId, "t": transcriptId, "c": cultivar, "og": "OG...",
        "p": productLowerOrNull, "pf": [...], "ip": [...], "go": [...] },
      ...
    ],
    "idx": { "pf": { "PF00566": [rowIds...] }, "ip": {...}, "go": {...} }
  }

Product "hypothetical protein" is nulled (too generic → excluded from scan).
GO tokens are stored WITHOUT the "GO:" prefix to save bytes (client re-adds).
EggNOG / COG are not indexed (Phase 1 MVP).

Usage:
  python3 scripts/build-functional-search-index.py --version 6
  python3 scripts/build-functional-search-index.py --version 6 --dry-run
"""

from __future__ import annotations

import argparse
import gzip
import json
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


def _strip_transcript(tid: str) -> str:
    # baegilmi_g42643.t1 → baegilmi_g42643
    if ".t" in tid:
        base, tail = tid.rsplit(".t", 1)
        if tail.isdigit():
            return base
    return tid


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--version", type=int, required=True)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--out-dir", type=Path, default=PROJECT_ROOT / "tmp")
    args = ap.parse_args()
    v = args.version

    bucket = init_firebase()

    # ── Step 1: load gene_index partitions → transcript→og map ──
    print(f"Loading gene_index v{v}…")
    gi_blobs = sorted(
        (b for b in bucket.list_blobs(prefix=f"gene_index/v{v}/by_prefix/")
         if b.name.endswith(".json")),
        key=lambda b: b.name,
    )
    tid_to_og: dict[str, str] = {}
    for b in gi_blobs:
        payload = json.loads(b.download_as_bytes())
        for tid, entry in payload.get("entries", {}).items():
            tid_to_og[tid] = entry["og"]
    print(f"  {len(tid_to_og)} transcript→og entries")

    # gene_id → og (first-seen transcript wins)
    gid_to_og: dict[str, str] = {}
    for tid, og in tid_to_og.items():
        gid = _strip_transcript(tid)
        gid_to_og.setdefault(gid, og)

    # Direct transcript lookup too (for rows where gene_models.transcript.id matches)
    # Already in tid_to_og above.

    # ── Step 2: walk gene_models → build rows + inverted indexes ──
    print(f"Loading gene_models v{v}…")
    gm_blobs = sorted(
        (b for b in bucket.list_blobs(prefix=f"gene_models/v{v}/by_prefix/")
         if b.name.endswith(".json") and "_manifest" not in b.name),
        key=lambda b: b.name,
    )

    rows: list[dict] = []
    idx_pf: dict[str, list[int]] = defaultdict(list)
    idx_ip: dict[str, list[int]] = defaultdict(list)
    idx_go: dict[str, list[int]] = defaultdict(list)
    cultivars_seen: set[str] = set()

    start = time.time()
    for b in gm_blobs:
        payload = json.loads(b.download_as_bytes())
        genes = payload.get("genes", {})
        for gid, g in genes.items():
            cultivar = g.get("cultivar", "")
            cultivars_seen.add(cultivar)
            tr = g.get("transcript", {})
            ann = g.get("annotation", {})
            tid = tr.get("id", gid)
            og = gid_to_og.get(gid) or tid_to_og.get(tid)

            product = ann.get("product")
            p_norm = None
            if product and product.strip().lower() != "hypothetical protein":
                p_norm = product.strip().lower()

            pf = ann.get("pfam") or []
            ip = ann.get("interpro") or []
            go_raw = ann.get("go") or []
            go = [t[3:] if t.startswith("GO:") else t for t in go_raw]

            row_id = len(rows)
            row: dict = {"g": gid, "t": tid, "c": cultivar}
            if og:
                row["og"] = og
            if p_norm:
                row["p"] = p_norm
            if pf:
                row["pf"] = pf
            if ip:
                row["ip"] = ip
            if go:
                row["go"] = go
            rows.append(row)

            for code in pf:
                idx_pf[code].append(row_id)
            for code in ip:
                idx_ip[code].append(row_id)
            for code in go:
                idx_go[code].append(row_id)
        print(f"  {b.name}: rows now {len(rows)}")

    elapsed = time.time() - start
    print(f"Built {len(rows)} rows across {len(cultivars_seen)} cultivars · "
          f"pf={len(idx_pf)} ip={len(idx_ip)} go={len(idx_go)} codes · "
          f"{elapsed:.1f}s")

    body = {
        "schemaVersion": 1,
        "orthofinderVersion": v,
        "builtAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "annotatedCultivars": sorted(cultivars_seen),
        "rowCount": len(rows),
        "rows": rows,
        "idx": {
            "pf": {k: idx_pf[k] for k in sorted(idx_pf)},
            "ip": {k: idx_ip[k] for k in sorted(idx_ip)},
            "go": {k: idx_go[k] for k in sorted(idx_go)},
        },
    }

    raw = json.dumps(body, separators=(",", ":")).encode("utf-8")
    gz = gzip.compress(raw, compresslevel=6)
    dest = f"functional_index/v{v}/index.json"
    if args.dry_run:
        out = args.out_dir / dest
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_bytes(raw)
        (out.with_suffix(".json.gz")).write_bytes(gz)
        print(f"dry-run: raw {len(raw) / 1024 / 1024:.1f} MB · "
              f"gz {len(gz) / 1024 / 1024:.1f} MB")
    else:
        # Upload gzipped with Content-Encoding: gzip so Firebase serves it
        # transparently decompressed to modern browsers. Content-Type stays
        # application/json so the fetch() body is already inflated JSON.
        blob = bucket.blob(dest)
        blob.content_encoding = "gzip"
        blob.cache_control = "public, max-age=3600"
        blob.upload_from_string(
            gz,
            content_type="application/json; charset=utf-8",
        )
        print(f"uploaded (gzip): {dest} · raw {len(raw) / 1024 / 1024:.1f} MB → "
              f"wire {len(gz) / 1024 / 1024:.1f} MB")

    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Build a compact OG → {trait, p, log2FC} hits index for cross-trait badges.

Reads Firestore `orthogroup_diffs/{traitId}` docs + their Storage payloads
(the large entries array). For each OG that clears the p-value threshold
in any usable trait, records a single-file index.

Output:
  trait_hits/v{of}_g{g}/index.json

Schema:
  {
    "schemaVersion": 1,
    "orthofinderVersion": N,
    "groupingVersion": M,
    "threshold": 0.05,
    "builtAt": "...",
    "traits": [...],                 # traits that contributed hits
    "hits": {
      "OG0000042": [
        { "t": "heading_date", "p": 0.003, "lfc": 0.8 },
        { "t": "panicle_length", "p": 0.012, "lfc": -0.4 }
      ],
      ...
    }
  }

Usage:
  python3 scripts/build-trait-hits-index.py
  python3 scripts/build-trait-hits-index.py --threshold 0.01 --dry-run
"""

from __future__ import annotations

import argparse
import gzip
import json
import sys
import time
from pathlib import Path

BUCKET = "green-rice-db.firebasestorage.app"
PROJECT_ROOT = Path(__file__).resolve().parent.parent


def init_firebase():
    import firebase_admin
    from firebase_admin import credentials, firestore, storage
    sa = PROJECT_ROOT / "service-account.json"
    if not sa.exists():
        raise SystemExit("service-account.json missing at repo root.")
    try:
        firebase_admin.get_app()
    except ValueError:
        firebase_admin.initialize_app(credentials.Certificate(str(sa)),
                                      {"storageBucket": BUCKET})
    return firestore.client(), storage.bucket()


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--threshold", type=float, default=0.05,
                    help="p-value cutoff (default: 0.05)")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--out-dir", type=Path, default=PROJECT_ROOT / "tmp")
    args = ap.parse_args()

    db, bucket = init_firebase()

    # 1. Enumerate orthogroup_diffs docs
    print("Reading orthogroup_diffs…")
    docs = list(db.collection("orthogroup_diffs").stream())
    print(f"  {len(docs)} trait docs")

    of_version: int | None = None
    g_version: int | None = None
    hits: dict[str, list[dict]] = {}
    traits_contributed: list[str] = []

    # 2. For each trait doc, fetch its entries payload (Storage)
    for doc in docs:
        trait_id = doc.id
        data = doc.to_dict() or {}
        storage_path = data.get("storagePath")
        of = data.get("orthofinderVersion")
        g = data.get("groupingVersion")
        if of is not None:
            of_version = int(of)
        if g is not None:
            g_version = int(g)
        if not storage_path:
            # legacy top[] path — skip for simplicity (assume Storage payload exists)
            print(f"  skipped {trait_id}: no storagePath")
            continue

        blob = bucket.blob(storage_path)
        if not blob.exists():
            print(f"  skipped {trait_id}: storage payload missing ({storage_path})")
            continue
        payload = json.loads(blob.download_as_bytes())
        entries = payload.get("entries", [])
        trait_hits = 0
        for e in entries:
            og = e.get("orthogroup")
            p = e.get("pValue")
            if og is None or p is None:
                continue
            if p >= args.threshold:
                continue
            lfc = e.get("log2FoldChange")
            rec: dict = {"t": trait_id, "p": round(float(p), 6)}
            if lfc is not None:
                rec["lfc"] = round(float(lfc), 3)
            hits.setdefault(og, []).append(rec)
            trait_hits += 1
        print(f"  {trait_id}: {trait_hits} hits below p={args.threshold}")
        if trait_hits > 0:
            traits_contributed.append(trait_id)

    # Sort each OG's hits by p ascending for UI convenience
    for og in hits:
        hits[og].sort(key=lambda r: r["p"])

    body = {
        "schemaVersion": 1,
        "orthofinderVersion": of_version,
        "groupingVersion": g_version,
        "threshold": args.threshold,
        "builtAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "traits": sorted(traits_contributed),
        "hitCount": len(hits),
        "hits": hits,
    }

    raw = json.dumps(body, separators=(",", ":")).encode("utf-8")
    gz = gzip.compress(raw, compresslevel=6)
    dest = f"trait_hits/v{of_version}_g{g_version}/index.json"
    if args.dry_run:
        out = args.out_dir / dest
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_bytes(raw)
        print(f"\ndry-run: wrote {out} (raw {len(raw) / 1024:.1f} KB · "
              f"gz {len(gz) / 1024:.1f} KB)")
    else:
        blob = bucket.blob(dest)
        blob.content_encoding = "gzip"
        blob.cache_control = "public, max-age=3600"
        blob.upload_from_string(
            gz,
            content_type="application/json; charset=utf-8",
        )
        print(f"\nuploaded (gzip): {dest} · raw {len(raw) / 1024:.1f} KB → "
              f"wire {len(gz) / 1024:.1f} KB")

    print(f"Total OGs with at least one hit: {len(hits)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

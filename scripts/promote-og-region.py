#!/usr/bin/env python3
"""Promote a verified local og_region v2 staging bundle to Firebase.

Pipeline:
  batch-region-extract.py (remote)  → local staging dir
  verify-og-region-bundle.ts        → validator green
  THIS SCRIPT                       → Firebase upload + pointer flip

Atomic order:
  1. Pre-flight: every final prefix for (of, g) must be empty.
  2. Upload every per-cluster graph JSON (if_generation_match=0).
  3. Upload every per-cluster AF JSON (if_generation_match=0).
  4. Upload per-trait AF manifests + graph manifest + cross-trait AF
     summary manifest.
  5. Pointer flip — overwrite downloads/_og_region_manifest.json.
  6. Post-promote smoke.

Usage:
  python3 scripts/promote-og-region.py <local-staging-dir>
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "functions-python"))

from shared.storage_paths import (  # noqa: E402
    og_region_af_manifest_path,
    og_region_af_path,
    og_region_af_summary_manifest_path,
    og_region_graph_manifest_path,
    og_region_graph_path,
    og_region_pointer_path,
)


BUCKET = "green-rice-db.firebasestorage.app"


def _pick_run_dir(staging: Path, prefix: str) -> Path:
    d = staging / prefix
    dirs = sorted(p for p in d.iterdir() if p.is_dir())
    if len(dirs) != 1:
        raise SystemExit(f"Expected exactly one run dir under {d}, found {len(dirs)}")
    return dirs[0]


def _git_short_sha() -> str:
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=PROJECT_ROOT, stderr=subprocess.DEVNULL,
        ).decode().strip()
    except Exception:
        return "unknown"


def init_firebase():
    import firebase_admin
    from firebase_admin import credentials, storage
    sa = PROJECT_ROOT / "service-account.json"
    if not sa.exists():
        raise SystemExit("service-account.json missing at repo root.")
    try:
        firebase_admin.get_app()
    except ValueError:
        cred = credentials.Certificate(str(sa))
        firebase_admin.initialize_app(cred, {"storageBucket": BUCKET})
    return storage.bucket()


def _upload(bucket, local: Path, dest: str, create_only: bool = True) -> None:
    blob = bucket.blob(dest)
    kwargs: dict = {"content_type": "application/json; charset=utf-8"}
    if create_only:
        kwargs["if_generation_match"] = 0
    blob.upload_from_filename(str(local), **kwargs)
    blob.cache_control = "public, max-age=3600"
    blob.patch()


def _assert_empty(bucket, prefix: str) -> None:
    for _ in bucket.list_blobs(prefix=prefix, max_results=1):
        raise SystemExit(
            f"Refusing to overwrite: final prefix {prefix!r} already has "
            "objects. Version pairs are immutable — bump of/g and "
            "regenerate.",
        )


def _smoke(path: str) -> None:
    url = (
        f"https://firebasestorage.googleapis.com/v0/b/{BUCKET}/o/"
        f"{urllib.parse.quote(path, safe='')}?alt=media&_cb={int(time.time())}"
    )
    req = urllib.request.Request(url, method="HEAD")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            if resp.status != 200:
                raise SystemExit(f"Smoke failed: {path} → HTTP {resp.status}")
    except urllib.error.HTTPError as e:
        raise SystemExit(f"Smoke failed: {path} → HTTP {e.code}")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("staging_dir", type=Path)
    args = ap.parse_args()
    staging = args.staging_dir.resolve()

    graph_run = _pick_run_dir(staging, "og_region_graph")
    af_run = _pick_run_dir(staging, "og_region_af")

    graph_manifest_local = graph_run / "_manifest.json"
    gm = json.loads(graph_manifest_local.read_text())
    of = int(gm["orthofinderVersion"])
    g = int(gm["groupingVersion"])

    bucket = init_firebase()

    # ── Pre-flight ────────────────────────────────────────────
    print("Pre-flight: immutability checks…")
    _assert_empty(bucket, f"og_region_graph/v{of}_g{g}/")
    _assert_empty(bucket, f"og_region_af/v{of}_g{g}/")
    print("  all clear")

    # ── Enumerate uploads ────────────────────────────────────
    graph_files: list[tuple[Path, str]] = []  # (local, dest)
    for og_dir in sorted(p for p in graph_run.iterdir() if p.is_dir()):
        og_id = og_dir.name
        for f in sorted(og_dir.iterdir()):
            if f.suffix != ".json":
                continue
            cid = f.stem
            graph_files.append((f, og_region_graph_path(of, g, og_id, cid)))

    af_files: list[tuple[Path, str]] = []
    trait_manifest_files: list[tuple[Path, str]] = []
    for trait_dir in sorted(p for p in af_run.iterdir() if p.is_dir()):
        trait = trait_dir.name
        for og_dir in sorted(p for p in trait_dir.iterdir() if p.is_dir()):
            og_id = og_dir.name
            for f in sorted(og_dir.iterdir()):
                if f.suffix != ".json":
                    continue
                cid = f.stem
                af_files.append((f, og_region_af_path(of, g, trait, og_id, cid)))
        m = trait_dir / "_manifest.json"
        if m.is_file():
            trait_manifest_files.append((m, og_region_af_manifest_path(of, g, trait)))

    print(f"Planned uploads: {len(graph_files)} graph + {len(af_files)} AF + "
          f"{len(trait_manifest_files) + 2} manifests")

    # ── Upload data files ────────────────────────────────────
    def _bulk_upload(files: list[tuple[Path, str]], label: str) -> None:
        start = time.time()
        for i, (local, dest) in enumerate(files, 1):
            _upload(bucket, local, dest, create_only=True)
            if i % 200 == 0:
                print(f"  {label}: {i}/{len(files)}  ({time.time()-start:.1f}s)")

    _bulk_upload(graph_files, "graph")
    _bulk_upload(af_files, "af")

    # ── Upload manifests (per-trait first, then graph + AF summary) ──
    for local, dest in trait_manifest_files:
        _upload(bucket, local, dest, create_only=True)
    _upload(bucket, graph_manifest_local, og_region_graph_manifest_path(of, g), create_only=True)
    _upload(
        bucket, af_run / "_manifest.json",
        og_region_af_summary_manifest_path(of, g), create_only=True,
    )
    print("  manifests uploaded")

    # ── Pointer flip (last, overwritable) ────────────────────
    pointer = {
        "activeOrthofinderVersion": of,
        "activeGroupingVersion": g,
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "appVersion": _git_short_sha(),
        "graphManifest": og_region_graph_manifest_path(of, g),
        "afManifests": {
            t: og_region_af_manifest_path(of, g, t)
            for t in sorted(p.name for p in af_run.iterdir() if p.is_dir())
        },
    }
    pointer_local = staging / "_pointer.json"
    pointer_local.write_text(json.dumps(pointer, indent=2) + "\n")
    _upload(bucket, pointer_local, og_region_pointer_path(), create_only=False)
    print(f"Pointer flipped → {og_region_pointer_path()}")

    # ── Post-promote smoke ───────────────────────────────────
    print("Post-promote smoke…")
    _smoke(og_region_pointer_path())
    _smoke(og_region_graph_manifest_path(of, g))
    first_trait = sorted(pointer["afManifests"].keys())[0]
    _smoke(pointer["afManifests"][first_trait])
    if graph_files:
        _smoke(graph_files[0][1])
    if af_files:
        _smoke(af_files[0][1])
    print("  all 200")

    print(f"\nPromote complete for v{of}_g{g}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

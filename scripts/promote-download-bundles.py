#!/usr/bin/env python3
"""Promote a verified local staging directory to Firebase Storage.

Pipeline (rev2 §2 / §13):
  generate → local staging dir
  verify   → check staging dir (scripts/verify-download-bundles.ts)
  promote  → THIS SCRIPT → Firebase Storage final prefixes

Immutability rule (rev2 §2, §14):
  If downloads/traits/{t}/v{of}_g{g}/ or downloads/cross-trait/v{of}_g{g}/
  already has ANY object, this script refuses to run. Re-releasing the
  same (of, g) is never allowed — bump the version in
  data/download_versions.json and regenerate.

The _manifest.json at downloads/_manifest.json is overwritable — it is a
single pointer file, and it is written last so that no half-published
state is visible to the UI.

Usage:
  python scripts/promote-download-bundles.py <local-staging-dir>
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "functions-python"))

from shared.storage_paths import (  # noqa: E402
    download_cross_trait_dir,
    download_manifest_path,
    download_trait_dir,
)


def init_firebase():
    import firebase_admin
    from firebase_admin import credentials, storage

    sa_path = PROJECT_ROOT / "service-account.json"
    if not sa_path.exists():
        raise RuntimeError(
            "service-account.json missing. Place the service account key at repo root."
        )
    try:
        firebase_admin.get_app()
    except ValueError:
        cred = credentials.Certificate(str(sa_path))
        firebase_admin.initialize_app(
            cred, {"storageBucket": "green-rice-db.firebasestorage.app"}
        )
    return storage.bucket()


def assert_prefix_empty(bucket, prefix: str) -> None:
    """Fail if any blob exists under the given prefix."""
    blobs = list(bucket.list_blobs(prefix=prefix, max_results=1))
    if blobs:
        raise RuntimeError(
            f"Refusing to overwrite: {prefix!r} already contains objects.\n"
            "Version pairs are immutable once promoted. Bump orthofinder or grouping "
            "version in data/download_versions.json and regenerate."
        )


def content_type_for(dest: str) -> str:
    # Every text artifact carries charset=utf-8 so browsers don't fall
    # back to Latin-1 and garble em-dashes, Greek delta, arrows, etc.
    if dest.endswith(".json"):
        return "application/json; charset=utf-8"
    if dest.endswith(".md"):
        return "text/markdown; charset=utf-8"
    if dest.endswith(".bed"):
        return "text/plain; charset=utf-8"
    return "text/tab-separated-values; charset=utf-8"


def upload_file(bucket, local: Path, dest: str, *, create_only: bool) -> None:
    blob = bucket.blob(dest)
    content_type = content_type_for(dest)
    # `if_generation_match=0` is GCS's atomic create-if-not-exists:
    # the upload fails with a 412 precondition error if any object
    # already exists at `dest`. Closes the TOCTOU window between the
    # pre-flight `assert_prefix_empty` walk and the actual upload.
    # The manifest file is the exception — it's an overwritable pointer.
    kwargs: dict = {"content_type": content_type}
    if create_only:
        kwargs["if_generation_match"] = 0
    blob.upload_from_filename(str(local), **kwargs)
    blob.cache_control = "public, max-age=3600"
    # Force "save as" instead of inline render. The HTML `download`
    # attribute is ignored for cross-origin URLs (Firebase Storage is
    # on a different origin than the app), so the server has to say it.
    # The manifest is the one exception — the UI fetches it
    # programmatically and never presents it as a download.
    if dest != download_manifest_path():
        blob.content_disposition = f'attachment; filename="{Path(dest).name}"'
    blob.patch()


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("staging_dir", type=Path, help="Local staging dir produced by generate-download-bundles.py")
    args = ap.parse_args()

    staging = args.staging_dir.resolve()
    if not staging.is_dir():
        print(f"Not a directory: {staging}", file=sys.stderr)
        return 2

    manifest_path = staging / "_manifest.json"
    if not manifest_path.is_file():
        print(f"Missing staging manifest: {manifest_path}", file=sys.stderr)
        return 2
    manifest = json.loads(manifest_path.read_text())

    of = int(manifest["orthofinderVersion"])
    g = int(manifest["groupingVersion"])

    bucket = init_firebase()

    # ── Pre-flight: immutability check on every final prefix ──
    prefixes_to_check = [f"{download_cross_trait_dir(of, g)}/"]
    for trait_id in manifest["traits"].keys():
        prefixes_to_check.append(f"{download_trait_dir(of, g, trait_id)}/")

    print(f"Pre-flight: checking {len(prefixes_to_check)} final prefixes for immutability …")
    for p in prefixes_to_check:
        assert_prefix_empty(bucket, p)
    print("  all clear")

    # ── Upload per-trait files ────────────────────────────────
    uploaded = 0
    for trait_id, entry in manifest["traits"].items():
        dest_dir = download_trait_dir(of, g, trait_id)
        src_dir = staging / "traits" / trait_id / f"v{of}_g{g}"
        for fname in entry["files"].keys():
            local = src_dir / fname
            if not local.is_file():
                raise RuntimeError(f"Missing staging file: {local}")
            upload_file(bucket, local, f"{dest_dir}/{fname}", create_only=True)
            uploaded += 1
        print(f"  uploaded {trait_id} ({len(entry['files'])} files)")

    # ── Upload cross-trait files ──────────────────────────────
    cross_dest = download_cross_trait_dir(of, g)
    cross_src = staging / "cross-trait" / f"v{of}_g{g}"
    for fname in manifest["crossTrait"]["files"].keys():
        local = cross_src / fname
        if not local.is_file():
            raise RuntimeError(f"Missing staging file: {local}")
        upload_file(bucket, local, f"{cross_dest}/{fname}", create_only=True)
        uploaded += 1
    print(f"  uploaded cross-trait ({len(manifest['crossTrait']['files'])} files)")

    # ── Finally: publish the manifest (UI flip) ───────────────
    # This is the last write in the whole flow; if everything above
    # succeeded, the UI will now see the new version pair. If we bailed
    # earlier, the previous manifest stays in place.
    print(f"Publishing manifest → {download_manifest_path()}")
    upload_file(bucket, manifest_path, download_manifest_path(), create_only=False)

    print(f"\nPromote complete. {uploaded} data files + manifest published for v{of}_g{g}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

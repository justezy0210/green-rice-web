"""
Storage operations for atomic orthofinder uploads.

Upload flow:
  1. Client writes to orthofinder/staging/{uploadId}/{filename}
  2. Callable function verifies + moves to orthofinder/v{N}/{filename}
  3. Staging path cleaned up
"""

from firebase_admin import storage

STAGING_PREFIX = "orthofinder/staging"
VERSIONS_PREFIX = "orthofinder/v"


def staging_path(upload_id: str, filename: str) -> str:
    return f"{STAGING_PREFIX}/{upload_id}/{filename}"


def version_path(version: int, filename: str) -> str:
    return f"{VERSIONS_PREFIX}{version}/{filename}"


def assert_staging_files_exist(upload_id: str, filenames: list[str]) -> None:
    bucket = storage.bucket()
    for fn in filenames:
        blob = bucket.blob(staging_path(upload_id, fn))
        if not blob.exists():
            raise FileNotFoundError(f"Staging file missing: {staging_path(upload_id, fn)}")


def commit_staging_to_version(upload_id: str, version: int, filenames: list[str]) -> dict[str, str]:
    """Move files from staging to v{N}/ and delete staging. Returns {filename: final_path}."""
    bucket = storage.bucket()
    final_paths: dict[str, str] = {}
    for fn in filenames:
        src = bucket.blob(staging_path(upload_id, fn))
        dst_path = version_path(version, fn)
        bucket.copy_blob(src, bucket, dst_path)
        src.delete()
        final_paths[fn] = dst_path
    return final_paths


def download_as_text(path: str) -> str:
    return storage.bucket().blob(path).download_as_text()


def upload_json(path: str, obj: dict) -> None:
    import json
    storage.bucket().blob(path).upload_from_string(
        json.dumps(obj), content_type="application/json"
    )


def download_json(path: str) -> dict:
    import json
    return json.loads(storage.bucket().blob(path).download_as_text())


def delete_version_dir(version: int) -> int:
    """
    Best-effort cleanup: remove every blob under orthofinder/v{version}/ .

    Used when a processing run fails BEFORE mark_committed — the version's files
    are orphaned (state was never made active). Never raises; failures are logged
    by the caller.

    Returns number of blobs deleted.
    """
    bucket = storage.bucket()
    prefix = f"{VERSIONS_PREFIX}{version}/"
    count = 0
    for blob in bucket.list_blobs(prefix=prefix):
        try:
            blob.delete()
            count += 1
        except Exception:
            # Swallow individual blob errors; caller decides what to log
            pass
    return count

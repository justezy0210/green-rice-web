"""HTTPS callable handler for orthofinder commit + diff recompute."""

import logging

from firebase_admin import firestore
from firebase_functions import https_fn

GROUPING_META = "_grouping_meta"
GROUPING_LOCK = "lock"


def handle(req: https_fn.CallableRequest) -> dict:
    from . import lock as of_lock
    from . import state as of_state
    from . import uploader
    from .chunker import StreamingChunkWriter
    from .gene_annotation import (
        load_baegilmi_gene_annotation,
        version_annotation_path,
    )
    from .orchestrator import recompute_all_diffs
    from .parser import (
        iter_orthogroups_with_desc_rows,
        parse_gene_count_tsv,
    )

    auth = req.auth
    if auth is None or not auth.token.get("admin", False):
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.PERMISSION_DENIED,
            "Admin role required.",
        )

    data = req.data or {}
    upload_id = data.get("uploadId")
    if not isinstance(upload_id, str) or not upload_id:
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            "uploadId is required.",
        )

    db = firestore.client()
    gene_count_name = "Orthogroups.GeneCount.tsv"
    desc_name = "Orthogroups_with_description.tsv"

    try:
        uploader.assert_staging_files_exist(upload_id, [gene_count_name, desc_name])
    except FileNotFoundError as e:
        raise https_fn.HttpsError(https_fn.FunctionsErrorCode.NOT_FOUND, str(e)) from e

    acquired, version = of_lock.try_acquire_lock(db)
    if not acquired:
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.FAILED_PRECONDITION,
            "Another orthofinder processing run is in progress.",
        )

    committed = False
    try:
        of_state.set_status(db, "processing")

        # ── Pre-commit steps: any failure here is cleaned up.
        final_paths = uploader.commit_staging_to_version(
            upload_id, version, [gene_count_name, desc_name]
        )

        gene_count_text = uploader.download_as_text(final_paths[gene_count_name])
        cultivar_ids, ogs = parse_gene_count_tsv(gene_count_text)
        matrix_path = f"orthofinder/v{version}/_matrix.json"
        uploader.upload_json(
            matrix_path,
            {
                "version": version,
                "cultivarIds": cultivar_ids,
                "totalOrthogroups": len(ogs),
                "ogs": ogs,
            },
        )

        # Parse Orthogroups_with_description.tsv (streaming):
        #   - write per-cultivar members into 1000-OG chunks (bounded memory)
        #   - collect IRGSP transcripts + descriptions into og_descriptions.json
        desc_text = uploader.download_as_text(final_paths[desc_name])
        writer = StreamingChunkWriter(version, uploader)
        og_descriptions: dict[str, dict] = {}
        for og_id, members, irgsp in iter_orthogroups_with_desc_rows(desc_text):
            writer.add(og_id, members)
            if irgsp["transcripts"] or irgsp["descriptions"]:
                og_descriptions[og_id] = irgsp
        n_chunks = writer.flush_all()
        logging.info(
            f"Wrote {n_chunks} og-members chunks, "
            f"{len(og_descriptions)} IRGSP descriptions for v{version}"
        )

        # IRGSP descriptions artifact — primary representative source
        uploader.upload_json(
            f"orthofinder/v{version}/og_descriptions.json",
            og_descriptions,
        )

        # Baegilmi GFF3 snapshot — only used by the frontend drawer for gene locations
        gene_annotation = load_baegilmi_gene_annotation()
        uploader.upload_json(version_annotation_path(version), gene_annotation)

        of_state.mark_committed(
            db,
            version=version,
            total_orthogroups=len(ogs),
            cultivar_ids=cultivar_ids,
            gene_count_path=final_paths[gene_count_name],
            genes_path=final_paths[desc_name],
            matrix_json_path=matrix_path,
        )
        committed = True

        # Post-commit: diff recompute. If this fails the artifacts remain.
        grouping_lock = db.collection(GROUPING_META).document(GROUPING_LOCK).get()
        grouping_version = int((grouping_lock.to_dict() or {}).get("version", 0) or 0)
        recompute_all_diffs(db, grouping_version)

        of_state.set_status(db, "complete")
        return {
            "version": version,
            "totalOrthogroups": len(ogs),
            "cultivarIds": cultivar_ids,
        }
    except https_fn.HttpsError:
        if not committed:
            _best_effort_cleanup(uploader, version)
        of_state.set_status(db, "error", error_message="HTTPS error (see server logs)")
        raise
    except Exception as e:
        logging.exception(f"Orthofinder processing failed: {e}")
        if not committed:
            _best_effort_cleanup(uploader, version)
        of_state.set_status(db, "error", error_message=str(e))
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INTERNAL, f"Processing failed: {e}"
        ) from e
    finally:
        of_lock.release_lock(db, version)


def _best_effort_cleanup(uploader, version: int) -> None:
    try:
        deleted = uploader.delete_version_dir(version)
        logging.info(f"Cleaned up orphaned v{version}/ ({deleted} blobs)")
    except Exception:
        logging.exception("Orphan cleanup failed (best-effort)")

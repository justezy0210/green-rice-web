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
    from .parser import parse_gene_count_tsv, parse_orthogroups_tsv_baegilmi_only
    from .orchestrator import recompute_all_diffs

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
    genes_name = "Orthogroups.tsv"

    try:
        uploader.assert_staging_files_exist(upload_id, [gene_count_name, genes_name])
    except FileNotFoundError as e:
        raise https_fn.HttpsError(https_fn.FunctionsErrorCode.NOT_FOUND, str(e)) from e

    acquired, version = of_lock.try_acquire_lock(db)
    if not acquired:
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.FAILED_PRECONDITION,
            "Another orthofinder processing run is in progress.",
        )

    try:
        of_state.set_status(db, "processing")

        final_paths = uploader.commit_staging_to_version(
            upload_id, version, [gene_count_name, genes_name]
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

        genes_text = uploader.download_as_text(final_paths[genes_name])
        baegilmi_by_og = parse_orthogroups_tsv_baegilmi_only(genes_text)
        baegilmi_path = f"orthofinder/v{version}/baegilmi_og_members.json"
        uploader.upload_json(baegilmi_path, baegilmi_by_og)

        of_state.mark_committed(
            db,
            version=version,
            total_orthogroups=len(ogs),
            cultivar_ids=cultivar_ids,
            gene_count_path=final_paths[gene_count_name],
            genes_path=final_paths[genes_name],
            matrix_json_path=matrix_path,
        )

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
        of_state.set_status(db, "error", error_message="HTTPS error (see server logs)")
        raise
    except Exception as e:
        logging.exception(f"Orthofinder processing failed: {e}")
        of_state.set_status(db, "error", error_message=str(e))
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INTERNAL, f"Processing failed: {e}"
        ) from e
    finally:
        of_lock.release_lock(db, version)

"""
Orchestrate diff recomputation for all traits.
Called from:
  - on_cultivar_change (after grouping completes, before lock release)
  - startOrthofinderProcessing callable (after new matrix commits)
"""

from . import state, uploader
from .diff import compute_diff_for_trait, delete_diff_document, write_diff_artifacts


def _og_descriptions_path(version: int) -> str:
    return f"orthofinder/v{version}/og_descriptions.json"


def recompute_all_diffs(db, grouping_version: int) -> int:
    """
    Load current orthofinder state + matrix + IRGSP descriptions, then
    compute diff for every grouping doc present in Firestore.
    Returns number of diff docs written. If no matrix is committed, returns 0.
    """
    st = state.get_state(db)
    active_version = int(st.get("activeVersion", 0) or 0)
    if active_version == 0:
        return 0

    matrix_path = st.get("matrixJsonPath")
    if not matrix_path:
        return 0

    matrix_data = uploader.download_json(matrix_path)
    matrix = matrix_data.get("ogs", {})

    # IRGSP descriptions — primary representative source.
    # Empty dict if the artifact is missing (legacy version).
    try:
        og_descriptions = uploader.download_json(_og_descriptions_path(active_version))
    except Exception:
        og_descriptions = {}

    import logging

    grouping_docs = db.collection("groupings").stream()
    written = 0
    for gd in grouping_docs:
        data = gd.to_dict() or {}
        trait_id = gd.id
        summary = data.get("summary", {}) or {}
        assignments = data.get("assignments", {}) or {}

        if summary.get("method") == "none":
            delete_diff_document(db, trait_id)
            continue

        try:
            result = compute_diff_for_trait(
                trait_id=trait_id,
                grouping_assignments=assignments,
                matrix=matrix,
                og_descriptions=og_descriptions,
                grouping_version=grouping_version,
                orthofinder_version=active_version,
            )
        except Exception:
            logging.exception(f"Diff computation failed for trait={trait_id}; skipping")
            continue

        if result is None:
            delete_diff_document(db, trait_id)
            continue

        meta, payload = result
        try:
            write_diff_artifacts(db, uploader, meta, payload)
        except Exception:
            # Storage upload or Firestore write failed. Leave any prior doc intact —
            # do NOT delete; users can still see legacy data until next successful run.
            logging.exception(
                f"Diff artifact write failed for trait={trait_id}; leaving prior state"
            )
            continue
        written += 1

    return written

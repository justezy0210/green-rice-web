"""
Orchestrate diff recomputation for all traits.
Called from:
  - on_cultivar_change (after grouping completes, before lock release)
  - startOrthofinderProcessing callable (after new matrix commits)
"""

from . import state, uploader
from .diff import compute_diff_for_trait, delete_diff_document, write_diff_document
from .gene_annotation import load_baegilmi_gene_annotation


def recompute_all_diffs(db, grouping_version: int) -> int:
    """
    Load current orthofinder state + matrix + gene annotation, then
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

    baegilmi_path = f"orthofinder/v{active_version}/baegilmi_og_members.json"
    try:
        baegilmi_genes_by_og = uploader.download_json(baegilmi_path)
    except Exception:
        baegilmi_genes_by_og = {}

    gene_annotation = load_baegilmi_gene_annotation()

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

        # A single malformed trait shouldn't abort the entire recompute.
        try:
            diff_doc = compute_diff_for_trait(
                trait_id=trait_id,
                grouping_assignments=assignments,
                matrix=matrix,
                baegilmi_genes_by_og=baegilmi_genes_by_og,
                gene_annotation=gene_annotation,
                grouping_version=grouping_version,
                orthofinder_version=active_version,
            )
        except Exception:
            logging.exception(f"Diff computation failed for trait={trait_id}; skipping")
            continue

        if diff_doc is None:
            delete_diff_document(db, trait_id)
            continue

        write_diff_document(db, diff_doc)
        written += 1

    return written

"""OrthofinderState read/write helpers."""

from datetime import datetime, timezone

STATE_COLLECTION = "_orthofinder_meta"
STATE_DOC = "state"


def get_state(db) -> dict:
    snap = db.collection(STATE_COLLECTION).document(STATE_DOC).get()
    return snap.to_dict() if snap.exists else {}


def set_state(db, state: dict) -> None:
    db.collection(STATE_COLLECTION).document(STATE_DOC).set(state)


def update_state(db, patch: dict) -> None:
    db.collection(STATE_COLLECTION).document(STATE_DOC).set(patch, merge=True)


def initial_state() -> dict:
    return {
        "status": "idle",
        "activeVersion": 0,
        "activeVersionUploadedAt": None,
        "totalOrthogroups": 0,
        "cultivarIds": [],
        "geneCountPath": "",
        "genesPath": "",
        "matrixJsonPath": "",
    }


def set_status(db, status: str, error_message: str | None = None) -> None:
    patch: dict = {"status": status}
    if error_message is None:
        patch["errorMessage"] = None
    else:
        patch["errorMessage"] = error_message
    update_state(db, patch)


def mark_committed(
    db,
    version: int,
    total_orthogroups: int,
    cultivar_ids: list,
    gene_count_path: str,
    genes_path: str,
    matrix_json_path: str,
) -> None:
    update_state(
        db,
        {
            "activeVersion": version,
            "activeVersionUploadedAt": datetime.now(timezone.utc).isoformat(),
            "totalOrthogroups": total_orthogroups,
            "cultivarIds": cultivar_ids,
            "geneCountPath": gene_count_path,
            "genesPath": genes_path,
            "matrixJsonPath": matrix_json_path,
        },
    )

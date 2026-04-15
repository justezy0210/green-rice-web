"""Grouping trigger handler. Extracted from main.py to keep entrypoint thin."""

import hashlib
import json
import logging
from datetime import datetime, timedelta, timezone

from firebase_admin import firestore

LEASE_DURATION = timedelta(minutes=10)
MAX_RETRIES = 3
PHENOTYPE_KEYS = ["daysToHeading", "morphology", "yield", "quality", "resistance"]
GROUPING_META = "_grouping_meta"
GROUPING_LOCK = "lock"
GROUPINGS = "groupings"


def should_trigger(before: dict | None, after: dict | None) -> bool:
    if before is None or after is None:
        return True
    for key in PHENOTYPE_KEYS:
        if before.get(key) != after.get(key):
            return True
    return False


def run_with_lock(db) -> None:
    for attempt in range(MAX_RETRIES):
        acquired, version = _try_acquire_lock(db)
        if not acquired:
            logging.info("Grouping lock held by another execution, skipping")
            return
        try:
            hash_before = _run_grouping(db, version)
            _run_diff_safely(db, version)
            hash_after = _compute_phenotype_hash(_load_cultivars(db))
            if hash_before == hash_after:
                _release_lock(db, version)
                return
            logging.info(f"Phenotype changed during run (attempt {attempt + 1}), retrying")
        except Exception as e:
            logging.exception(f"Grouping run failed: {e}")
            _release_lock(db, version)
            raise
    logging.warning(f"Grouping did not stabilize after {MAX_RETRIES} retries")
    _release_lock(db, version)


def _try_acquire_lock(db) -> tuple[bool, int]:
    ref = db.collection(GROUPING_META).document(GROUPING_LOCK)

    @firestore.transactional
    def txn(transaction):
        snap = ref.get(transaction=transaction)
        now = datetime.now(timezone.utc)
        data = snap.to_dict() if snap.exists else {}
        status = data.get("status", "idle")
        lease_str = data.get("leaseExpiresAt")
        version = int(data.get("version", 0))
        if status == "running" and lease_str:
            if datetime.fromisoformat(lease_str) > now:
                return (False, version)
        new_version = version + 1
        transaction.set(
            ref,
            {
                "status": "running",
                "leaseExpiresAt": (now + LEASE_DURATION).isoformat(),
                "version": new_version,
                "completedAt": data.get("completedAt", ""),
                "phenotypeHash": data.get("phenotypeHash", ""),
            },
        )
        return (True, new_version)

    return txn(db.transaction())


def _release_lock(db, version: int) -> None:
    ref = db.collection(GROUPING_META).document(GROUPING_LOCK)
    now = datetime.now(timezone.utc).isoformat()
    cultivars = _load_cultivars(db)
    ref.set(
        {
            "status": "idle",
            "leaseExpiresAt": None,
            "version": version,
            "completedAt": now,
            "phenotypeHash": _compute_phenotype_hash(cultivars),
        }
    )


def _run_grouping(db, version: int) -> str:
    from .orchestrator import run_grouping

    cultivars = _load_cultivars(db)
    hash_before = _compute_phenotype_hash(cultivars)
    results = run_grouping(cultivars, version)

    batch = db.batch()
    for trait_id, doc in results.items():
        ref = db.collection(GROUPINGS).document(trait_id)
        batch.set(
            ref,
            {
                "summary": {
                    "traitId": doc.summary.traitId,
                    "method": doc.summary.method,
                    "nGroups": doc.summary.nGroups,
                    "scoreMetric": doc.summary.scoreMetric,
                    "scoreValue": doc.summary.scoreValue,
                    "version": doc.summary.version,
                    "updatedAt": doc.summary.updatedAt,
                },
                "quality": {
                    "traitId": doc.quality.traitId,
                    "nObserved": doc.quality.nObserved,
                    "nUsedInModel": doc.quality.nUsedInModel,
                    "missingRate": doc.quality.missingRate,
                    "usable": doc.quality.usable,
                    "note": doc.quality.note,
                },
                "assignments": doc.assignments,
            },
        )
    batch.commit()
    return hash_before


def _run_diff_safely(db, grouping_version: int) -> None:
    """Compute orthogroup diffs if a matrix exists. Never aborts grouping on failure."""
    try:
        from orthofinder.orchestrator import recompute_all_diffs
        written = recompute_all_diffs(db, grouping_version)
        logging.info(f"Recomputed {written} orthogroup diff documents")
    except Exception:
        logging.exception("Orthogroup diff recomputation failed (non-fatal)")


def _load_cultivars(db) -> list[dict]:
    docs = db.collection("cultivars").stream()
    result = []
    for d in docs:
        data = d.to_dict() or {}
        data["_id"] = d.id
        result.append(data)
    return result


def _compute_phenotype_hash(cultivars: list[dict]) -> str:
    sorted_cults = sorted(cultivars, key=lambda c: c["_id"])
    payload = []
    for c in sorted_cults:
        entry = {"_id": c["_id"]}
        for key in PHENOTYPE_KEYS:
            entry[key] = c.get(key)
        payload.append(entry)
    encoded = json.dumps(payload, sort_keys=True, default=str).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()

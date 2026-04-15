"""Lease-based lock for orthofinder processing (same pattern as grouping)."""

from datetime import datetime, timedelta, timezone
from firebase_admin import firestore

META_COLLECTION = "_orthofinder_meta"
LOCK_DOC = "lock"
STATE_DOC = "state"
LEASE_DURATION = timedelta(minutes=10)


def try_acquire_lock(db) -> tuple[bool, int]:
    """Returns (acquired, new_version). Takes over expired leases."""
    lock_ref = db.collection(META_COLLECTION).document(LOCK_DOC)

    @firestore.transactional
    def txn(transaction):
        snap = lock_ref.get(transaction=transaction)
        now = datetime.now(timezone.utc)
        data = snap.to_dict() if snap.exists else {}
        status = data.get("status", "idle")
        lease_str = data.get("leaseExpiresAt")
        version = int(data.get("version", 0))

        if status == "running" and lease_str:
            lease_expires = datetime.fromisoformat(lease_str)
            if lease_expires > now:
                return (False, version)

        new_version = version + 1
        transaction.set(
            lock_ref,
            {
                "status": "running",
                "leaseExpiresAt": (now + LEASE_DURATION).isoformat(),
                "version": new_version,
            },
        )
        return (True, new_version)

    return txn(db.transaction())


def release_lock(db, version: int) -> None:
    lock_ref = db.collection(META_COLLECTION).document(LOCK_DOC)
    lock_ref.set(
        {
            "status": "idle",
            "leaseExpiresAt": None,
            "version": version,
        }
    )

"""
Cloud Function entry points (thin entrypoint; logic lives in submodules).
 - on_cultivar_change: phenotype grouping + orthogroup diff recompute
 - start_orthofinder_processing: admin-only HTTPS callable for atomic orthofinder commit
"""

from firebase_admin import firestore, initialize_app
from firebase_functions import https_fn, options
from firebase_functions.firestore_fn import (
    Change,
    DocumentSnapshot,
    Event,
    on_document_written,
)

# NOTE: heavy imports (scikit-learn, numpy, pandas) are deferred inside function bodies
# to stay under the 10-second backend discovery timeout at deploy time.

initialize_app()

options.set_global_options(
    region="asia-northeast3",
    memory=options.MemoryOption.GB_1,
    timeout_sec=540,
)


@on_document_written(document="cultivars/{cultivarId}")
def on_cultivar_change(event: Event[Change[DocumentSnapshot]]) -> None:
    from grouping.trigger import run_with_lock, should_trigger

    before = event.data.before.to_dict() if event.data.before else None
    after = event.data.after.to_dict() if event.data.after else None
    if not should_trigger(before, after):
        return
    run_with_lock(firestore.client())


@https_fn.on_call()
def start_orthofinder_processing(req: https_fn.CallableRequest) -> dict:
    """
    Admin-only: commit a staged orthofinder upload and recompute all diffs.
    Input:  { uploadId: string }
    Output: { version, totalOrthogroups, cultivarIds }
    """
    from orthofinder.callable import handle
    return handle(req)

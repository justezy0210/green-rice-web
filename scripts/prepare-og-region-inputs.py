#!/usr/bin/env python3
"""Produce the inputs the remote extractor needs for an og_region v2 run.

Writes two files (local FS) that are then scp-ed to the server:
  /tmp/og_region_inputs/candidate_ogs.txt     # one OG id per line
  /tmp/og_region_inputs/groupings_all.json    # { trait: { groupLabels, groupMembers } }

Both files also get a sha256 sidecar (candidate_ogs.txt.sha256 etc.) so
the extractor can stamp them into the graph + AF manifest
`inputFingerprints`.

Sources:
  - data/download_versions.json  (active (of, g) SSOT)
  - Firestore  _orthofinder_meta/state.activeVersion  (sanity check)
  - Firestore  groupings/{trait}   (usable=true + assignments)
  - Firebase Storage  orthogroup_diffs/v{of}/g{g}/{trait}.json  (candidate OG list)

Usage:
  python3 scripts/prepare-og-region-inputs.py
  python3 scripts/prepare-og-region-inputs.py --out-dir /tmp/og_region_inputs
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "functions-python"))

from shared.manifests import load_download_versions, load_traits  # noqa: E402


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def init_firebase():
    import firebase_admin
    from firebase_admin import credentials, firestore, storage
    sa = PROJECT_ROOT / "service-account.json"
    if not sa.exists():
        raise SystemExit("service-account.json missing at repo root.")
    try:
        firebase_admin.get_app()
    except ValueError:
        cred = credentials.Certificate(str(sa))
        firebase_admin.initialize_app(
            cred, {"storageBucket": "green-rice-db.firebasestorage.app"},
        )
    return firestore.client(), storage.bucket()


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--out-dir", type=Path, default=Path("/tmp/og_region_inputs"),
        help="Directory for candidate_ogs.txt + groupings_all.json (+sha256).",
    )
    args = ap.parse_args()
    args.out_dir.mkdir(parents=True, exist_ok=True)

    versions = load_download_versions()
    of = int(versions["activeOrthofinderVersion"])
    g = int(versions["activeGroupingVersion"])

    db, bucket = init_firebase()

    # ── Sanity: SSOT active version vs Firestore state ───────
    state = db.collection("_orthofinder_meta").document("state").get()
    if state.exists:
        live_of = state.to_dict().get("activeVersion")
        if live_of != of:
            print(
                f"WARN: download_versions.json says of={of} but Firestore "
                f"_orthofinder_meta.state.activeVersion={live_of}. "
                f"Bump data/download_versions.json before running extractor.",
                file=sys.stderr,
            )

    # ── Build groupings_all.json from usable traits only ────
    all_traits = load_traits()
    groupings_all: dict[str, dict] = {}
    for t in all_traits:
        trait_id = t["id"]
        doc = db.collection("groupings").document(trait_id).get()
        if not doc.exists:
            continue
        data = doc.to_dict() or {}
        quality = data.get("quality") or {}
        if not quality.get("usable"):
            continue
        summary_v = (data.get("summary") or {}).get("version")
        if summary_v != g:
            print(
                f"WARN: grouping/{trait_id}.summary.version={summary_v} != "
                f"active g={g}. Skipping.",
                file=sys.stderr,
            )
            continue
        assignments = data.get("assignments") or {}
        members: dict[str, list[str]] = {}
        for cultivar_id, a in assignments.items():
            label = (a or {}).get("groupLabel")
            if not label or a.get("borderline"):
                continue
            members.setdefault(label, []).append(cultivar_id)
        # Sort cultivar lists for deterministic output
        for lbl in members:
            members[lbl].sort()
        group_labels = sorted(members.keys())
        groupings_all[trait_id] = {
            "groupLabels": group_labels,
            "groupMembers": members,
        }

    # ── Dedupe candidate OGs across all usable traits ───────
    candidate_ogs: set[str] = set()
    for trait_id in groupings_all.keys():
        diff_path = f"orthogroup_diffs/v{of}/g{g}/{trait_id}.json"
        blob = bucket.blob(diff_path)
        if not blob.exists():
            # Some deployments write the diff on the Firestore doc itself.
            doc = db.collection("orthogroup_diffs").document(trait_id).get()
            entries = (doc.to_dict() or {}).get("top") or [] if doc.exists else []
        else:
            payload = json.loads(blob.download_as_text())
            entries = payload.get("entries") or []
        for e in entries:
            og = e.get("orthogroup")
            if isinstance(og, str) and og:
                candidate_ogs.add(og)

    # ── Write outputs ────────────────────────────────────────
    cand_path = args.out_dir / "candidate_ogs.txt"
    cand_path.write_text("\n".join(sorted(candidate_ogs)) + "\n")

    groupings_path = args.out_dir / "groupings_all.json"
    groupings_path.write_text(
        json.dumps(groupings_all, indent=2, sort_keys=True) + "\n"
    )

    # sha256 sidecars for reproducibility
    (args.out_dir / "candidate_ogs.txt.sha256").write_text(sha256_of(cand_path) + "\n")
    (args.out_dir / "groupings_all.json.sha256").write_text(
        sha256_of(groupings_path) + "\n",
    )

    print(f"Candidate OGs (dedupe): {len(candidate_ogs)}")
    print(f"Usable traits:         {len(groupings_all)}  " + ", ".join(sorted(groupings_all.keys())))
    print(f"Active pair:           v{of}_g{g}")
    print(f"Outputs:               {args.out_dir}/")
    print(f"  candidate_ogs.txt     sha256={sha256_of(cand_path)}")
    print(f"  groupings_all.json    sha256={sha256_of(groupings_path)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

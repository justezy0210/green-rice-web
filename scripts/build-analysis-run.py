#!/usr/bin/env python3
"""Build analysis_runs/{runId} documents from orthogroup_diffs.

Phase 2B: server-side materialisation of the 5-step workflow's Phase 2A
client-side derivation. Reads existing orthogroup_diffs docs (+ their
Storage payloads), applies the shared.candidate_scoring mirror, and
writes:

  Firestore
    analysis_runs/{runId}                               run header
    analysis_runs/{runId}/candidates/{candidateId}      candidate header
    entity_analysis_index/og_{ogId}                     reverse index per OG

Storage
    analysis_runs/{runId}/candidates/{candidateId}.json.gz   full evidence

runId format: `{trait}_g{groupingV}_of{ofV}_sv0_gm{geneModelV}_sc{scoringV}`.
`sv0` is fixed in Phase 2B (no SV matrix yet); geneModelV defaults to 11
and can be overridden per invocation.

Usage:
  python3 scripts/build-analysis-run.py [--trait heading_date] \\
      [--gene-model 11] [--scoring 0] [--dry-run] [--out-dir tmp/]
"""

from __future__ import annotations

import argparse
import dataclasses
import gzip
import json
import sys
import time
from dataclasses import asdict
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "functions-python"))

from shared.candidate_scoring import (  # noqa: E402
    ScoredCandidate,
    rank_candidates,
)

BUCKET = "green-rice-db.firebasestorage.app"
SCORING_V_DEFAULT = 0
GENE_MODEL_V_DEFAULT = 11
SV_V_DEFAULT = 0
SCHEMA_VERSION = 1


def init_firebase():
    import firebase_admin
    from firebase_admin import credentials, firestore, storage

    sa = PROJECT_ROOT / "service-account.json"
    if not sa.exists():
        raise SystemExit("service-account.json missing at repo root.")
    try:
        firebase_admin.get_app()
    except ValueError:
        firebase_admin.initialize_app(
            credentials.Certificate(str(sa)), {"storageBucket": BUCKET}
        )
    return firestore.client(), storage.bucket()


def encode_run_id(
    trait_id: str,
    grouping_v: int,
    orthofinder_v: int,
    sv_v: int,
    gene_model_v: int,
    scoring_v: int,
) -> str:
    return (
        f"{trait_id}_g{grouping_v}_of{orthofinder_v}"
        f"_sv{sv_v}_gm{gene_model_v}_sc{scoring_v}"
    )


def candidate_header_dict(c: ScoredCandidate, created_at: str) -> dict:
    return {
        "candidateId": c.candidate_id,
        "runId": c.run_id,
        "traitId": c.trait_id,
        "candidateType": c.candidate_type,
        "primaryOgId": c.primary_og_id,
        "leadGeneId": c.lead_gene_id,
        "leadRegion": None,
        "leadSvId": None,
        "rank": c.rank,
        "totalScore": c.total_score,
        "scoreBreakdown": [asdict(s) for s in c.score_breakdown],
        "groupSpecificitySummary": c.group_specificity_summary,
        "functionSummary": c.function_summary,
        "orthogroupPatternSummary": c.orthogroup_pattern_summary,
        "svImpactSummary": None,
        "syntenySummary": None,
        "expressionSummary": None,
        "qtlSummary": None,
        "badges": list(c.badges),
        "storageBundlePath": f"analysis_runs/{c.run_id}/candidates/{c.candidate_id}.json.gz",
        "createdAt": created_at,
    }


def candidate_bundle_dict(c: ScoredCandidate, created_at: str) -> dict:
    return {
        **candidate_header_dict(c, created_at),
        "schemaVersion": SCHEMA_VERSION,
    }


def run_doc_dict(
    run_id: str,
    trait_id: str,
    grouping_v: int,
    orthofinder_v: int,
    sv_v: int,
    gene_model_v: int,
    scoring_v: int,
    candidate_count: int,
    now_iso: str,
) -> dict:
    return {
        "runId": run_id,
        "traitId": trait_id,
        "groupingVersion": grouping_v,
        "orthofinderVersion": orthofinder_v,
        "svReleaseId": None if sv_v == 0 else f"sv_v{sv_v}",
        "intersectionReleaseId": None,
        "geneModelVersion": gene_model_v,
        "scoringVersion": scoring_v,
        "sampleSetVersion": f"gm{gene_model_v}",
        "sampleCount": gene_model_v,
        "status": "ready",
        "stepAvailability": {
            "phenotype": "ready",
            "orthogroups": "ready",
            "variants": "disabled",
            "intersections": "disabled",
            "candidates": "ready",
        },
        "candidateCount": candidate_count,
        "createdAt": now_iso,
        "updatedAt": now_iso,
    }


def entity_index_dict(
    og_id: str, linked: list[tuple[str, ScoredCandidate, str]], now_iso: str
) -> dict:
    top = [
        {
            "runId": run_id,
            "candidateId": c.candidate_id,
            "traitId": trait_id,
            "rank": c.rank,
            "totalScore": c.total_score,
            "candidateType": c.candidate_type,
        }
        for run_id, c, trait_id in linked
    ]
    top.sort(key=lambda x: x["rank"])
    return {
        "entityType": "og",
        "entityId": og_id,
        "linkedRuns": sorted({r for r, _, _ in linked}),
        "topCandidates": top,
        "latestUpdatedAt": now_iso,
    }


def process_trait(
    db,
    bucket,
    trait_id: str,
    gene_model_v: int,
    scoring_v: int,
    *,
    dry_run: bool,
    out_dir: Path,
    entity_accumulator: dict[str, list],
) -> tuple[str, int]:
    doc_ref = db.collection("orthogroup_diffs").document(trait_id)
    snap = doc_ref.get()
    if not snap.exists:
        print(f"  skip {trait_id}: no orthogroup_diffs document")
        return "", 0
    data = snap.to_dict() or {}
    orthofinder_v = int(data.get("orthofinderVersion") or 0)
    grouping_v = int(data.get("groupingVersion") or 0)
    storage_path = data.get("storagePath")
    if not storage_path:
        print(f"  skip {trait_id}: no storagePath")
        return "", 0

    blob = bucket.blob(storage_path)
    if not blob.exists():
        print(f"  skip {trait_id}: storage payload missing ({storage_path})")
        return "", 0
    payload = json.loads(blob.download_as_bytes())
    entries = payload.get("entries") or []

    run_id = encode_run_id(
        trait_id, grouping_v, orthofinder_v, SV_V_DEFAULT, gene_model_v, scoring_v
    )
    ranked = rank_candidates(run_id, trait_id, entries)
    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    print(f"  {trait_id} → {run_id}  · {len(ranked)} candidates (from {len(entries)} entries)")

    # Accumulate reverse index
    for c in ranked:
        entity_accumulator.setdefault(c.primary_og_id, []).append((run_id, c, trait_id))

    if dry_run:
        trait_dir = out_dir / "analysis_runs" / run_id
        trait_dir.mkdir(parents=True, exist_ok=True)
        (trait_dir / "run.json").write_text(
            json.dumps(
                run_doc_dict(
                    run_id,
                    trait_id,
                    grouping_v,
                    orthofinder_v,
                    SV_V_DEFAULT,
                    gene_model_v,
                    scoring_v,
                    len(ranked),
                    now_iso,
                ),
                indent=2,
            )
        )
        candidates_dir = trait_dir / "candidates"
        candidates_dir.mkdir(parents=True, exist_ok=True)
        for c in ranked:
            (candidates_dir / f"{c.candidate_id}.json").write_text(
                json.dumps(candidate_bundle_dict(c, now_iso), indent=2)
            )
        return run_id, len(ranked)

    # Live write to Firestore + Storage
    from google.cloud import firestore as gcf  # noqa: F401  (batch typing)

    db.collection("analysis_runs").document(run_id).set(
        run_doc_dict(
            run_id,
            trait_id,
            grouping_v,
            orthofinder_v,
            SV_V_DEFAULT,
            gene_model_v,
            scoring_v,
            len(ranked),
            now_iso,
        )
    )
    candidates_col = db.collection("analysis_runs").document(run_id).collection("candidates")
    # Firestore batched write — up to 500 ops per batch.
    batch = db.batch()
    ops = 0
    for c in ranked:
        batch.set(
            candidates_col.document(c.candidate_id),
            candidate_header_dict(c, now_iso),
        )
        ops += 1
        if ops >= 450:
            batch.commit()
            batch = db.batch()
            ops = 0
    if ops:
        batch.commit()

    # Storage bundles per candidate
    for c in ranked:
        blob = bucket.blob(f"analysis_runs/{run_id}/candidates/{c.candidate_id}.json.gz")
        bundle = candidate_bundle_dict(c, now_iso)
        gz = gzip.compress(
            json.dumps(bundle, separators=(",", ":")).encode("utf-8"), compresslevel=6
        )
        blob.content_encoding = "gzip"
        blob.cache_control = "public, max-age=3600"
        blob.upload_from_string(gz, content_type="application/json; charset=utf-8")

    return run_id, len(ranked)


def write_entity_index(
    db, out_dir: Path, entity_accumulator: dict[str, list], *, dry_run: bool, now_iso: str
) -> None:
    if not entity_accumulator:
        print("no candidates produced; skipping entity_analysis_index")
        return
    if dry_run:
        idx_dir = out_dir / "entity_analysis_index"
        idx_dir.mkdir(parents=True, exist_ok=True)
        for og_id, linked in entity_accumulator.items():
            (idx_dir / f"og_{og_id}.json").write_text(
                json.dumps(entity_index_dict(og_id, linked, now_iso), indent=2)
            )
        print(f"dry-run: wrote {len(entity_accumulator)} entity_analysis_index stubs")
        return

    batch = db.batch()
    ops = 0
    for og_id, linked in entity_accumulator.items():
        ref = db.collection("entity_analysis_index").document(f"og_{og_id}")
        batch.set(ref, entity_index_dict(og_id, linked, now_iso))
        ops += 1
        if ops >= 450:
            batch.commit()
            batch = db.batch()
            ops = 0
    if ops:
        batch.commit()
    print(f"wrote {len(entity_accumulator)} entity_analysis_index documents")


def main() -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--trait", help="process a single trait (default: all)")
    ap.add_argument(
        "--gene-model",
        type=int,
        default=GENE_MODEL_V_DEFAULT,
        help=f"geneModelVersion (default: {GENE_MODEL_V_DEFAULT})",
    )
    ap.add_argument(
        "--scoring",
        type=int,
        default=SCORING_V_DEFAULT,
        help=f"scoringVersion (default: {SCORING_V_DEFAULT})",
    )
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--out-dir", type=Path, default=PROJECT_ROOT / "tmp")
    args = ap.parse_args()

    db, bucket = init_firebase()

    if args.trait:
        trait_ids = [args.trait]
    else:
        trait_ids = [d.id for d in db.collection("orthogroup_diffs").stream()]
        trait_ids.sort()

    entity_accumulator: dict[str, list] = {}
    total_runs = 0
    total_candidates = 0
    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    for trait_id in trait_ids:
        run_id, n = process_trait(
            db,
            bucket,
            trait_id,
            args.gene_model,
            args.scoring,
            dry_run=args.dry_run,
            out_dir=args.out_dir,
            entity_accumulator=entity_accumulator,
        )
        if run_id:
            total_runs += 1
            total_candidates += n

    write_entity_index(
        db, args.out_dir, entity_accumulator, dry_run=args.dry_run, now_iso=now_iso
    )

    print(
        f"\nDone. {total_runs} runs · {total_candidates} candidates · "
        f"{len(entity_accumulator)} unique OGs"
    )
    return 0


# dataclasses reference used to keep import at module scope (avoid flake)
_ = dataclasses
if __name__ == "__main__":
    sys.exit(main())

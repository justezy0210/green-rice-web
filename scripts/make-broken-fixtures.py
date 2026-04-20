#!/usr/bin/env python3
"""Generate gitignored negative-case fixtures for promote-og-region preflight.

Two fixtures under scripts/test-fixtures/:

  1. og-region-broken-totals/        → manifest totals sum mismatch
  2. og-region-broken-af-traits/     → AF summary keys != trait dirs

Each fixture is a minimal but structurally valid staging layout that
should cause _preflight_invariants() to raise SystemExit.

Run:
  python3 scripts/make-broken-fixtures.py
"""

from __future__ import annotations

import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent / "test-fixtures"


def _clean_graph_manifest() -> dict:
    return {
        "schemaVersion": 2,
        "orthofinderVersion": 99,
        "groupingVersion": 99,
        "generatedAt": "2026-04-20T00:00:00Z",
        "extractorGitSha": "fixture",
        "inputFingerprints": {
            "hal": {"sha256": "0" * 64, "size": 0},
            "gbz": {"sha256": "0" * 64, "size": 0},
            "geneCoordsDir": {"contentHash": "0" * 64},
            "candidateListSha256": "0" * 64,
        },
        "clusterCap": 10,
        "flankBp": 1000,
        "clusterThresholdBp": 1000,
        "anchorPriority": ["baegilmi"],
        "totals": {
            "candidateOgs": 2,
            "ogsEmitted": 1,
            "ogsSkipped": 1,
            "clustersEmitted": 1,
            "statusCounts": {"graph_ok": 1, "graph_empty": 0, "graph_error": 0},
            "skipReasonCounts": {"NO_CLUSTERS": 1},
        },
        "ogs": {
            "OG0000001": {
                "status": "emitted",
                "anchorCultivar": "baegilmi",
                "truncated": False,
                "clusters": [
                    {
                        "clusterId": "c0",
                        "chr": "chr01",
                        "start": 1000,
                        "end": 2000,
                        "geneCount": 1,
                        "kind": "singleton",
                        "graphStatus": "ok",
                    }
                ],
            },
            "OG0000002": {"status": "skipped", "skipReason": "NO_CLUSTERS", "clusters": []},
        },
    }


def _clean_af_summary() -> dict:
    return {
        "schemaVersion": 2,
        "orthofinderVersion": 99,
        "groupingVersion": 99,
        "generatedAt": "2026-04-20T00:00:00Z",
        "traits": {
            "heading_date": {"usable": True, "ogsEmitted": 1, "clustersEmitted": 1},
        },
    }


def _per_trait_manifest(trait: str) -> dict:
    return {
        "schemaVersion": 2,
        "orthofinderVersion": 99,
        "groupingVersion": 99,
        "trait": trait,
        "usable": True,
        "groupLabels": ["early", "late"],
        "generatedAt": "2026-04-20T00:00:00Z",
        "extractorGitSha": "fixture",
        "inputFingerprints": {
            "vcf": {"sha256": "0" * 64, "size": 0},
            "groupingsDocVersion": 99,
        },
        "totals": {
            "ogsEmitted": 1,
            "clustersEmitted": 1,
            "statusCounts": {
                "af_ok": 1,
                "af_no_variants": 0,
                "af_unmapped": 0,
                "af_error": 0,
            },
        },
        "ogs": {},
    }


def _write(path: Path, body: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(body, indent=2) + "\n")


def build_totals_mismatch() -> Path:
    base = ROOT / "og-region-broken-totals"
    if base.exists():
        shutil.rmtree(base)
    graph_run = base / "og_region_graph" / "run_broken"
    af_run = base / "og_region_af" / "run_broken"

    gm = _clean_graph_manifest()
    # break totals: emitted + skipped != candidateOgs
    gm["totals"]["ogsSkipped"] = 5

    _write(graph_run / "_manifest.json", gm)
    _write(af_run / "_manifest.json", _clean_af_summary())
    _write(af_run / "heading_date" / "_manifest.json", _per_trait_manifest("heading_date"))
    return base


def build_af_trait_mismatch() -> Path:
    base = ROOT / "og-region-broken-af-traits"
    if base.exists():
        shutil.rmtree(base)
    graph_run = base / "og_region_graph" / "run_broken"
    af_run = base / "og_region_af" / "run_broken"

    _write(graph_run / "_manifest.json", _clean_graph_manifest())

    # Summary claims two traits but only one dir exists.
    summary = _clean_af_summary()
    summary["traits"]["panicle_length"] = {
        "usable": True,
        "ogsEmitted": 1,
        "clustersEmitted": 1,
    }
    _write(af_run / "_manifest.json", summary)
    _write(af_run / "heading_date" / "_manifest.json", _per_trait_manifest("heading_date"))
    # panicle_length dir deliberately absent
    return base


def main() -> int:
    a = build_totals_mismatch()
    b = build_af_trait_mismatch()
    print(f"wrote {a}")
    print(f"wrote {b}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""
Select top-N candidate OGs for a trait, restricted to IRGSP-linked OGs that have
cultivar gene coordinates (so cluster anchoring is possible).

Inputs:
  - diff payload:   orthogroup_diffs/v{N}/g{M}/{traitId}.json
  - coords dir:     og_gene_coords/chunk_*.json

Output:
  - TSV to stdout:  og_id\tcategory\tmeanDiff\tpValue

Category is inferred from total gene count across cultivars (single_gene / tandem
/ multi_copy) to mirror pilot sampling — useful for downstream inspection.

Usage:
  python3 scripts/select-candidate-ogs.py \\
    --diff orthogroup_diffs/v1/g1/heading_date.json \\
    --coords-dir og_gene_coords/ \\
    --top 50 \\
    > /tmp/candidates_heading_date.tsv
"""

import argparse
import json
import os
import sys


def load_all_coords(coords_dir: str) -> dict:
    og_coords = {}
    for f in sorted(os.listdir(coords_dir)):
        if not f.endswith(".json"):
            continue
        with open(os.path.join(coords_dir, f)) as fh:
            og_coords.update(json.load(fh))
    return og_coords


def infer_category(cultivars: dict) -> str:
    total_genes = sum(len(g) for g in cultivars.values())
    n_cultivars = len(cultivars)
    if n_cultivars == 0:
        return "no_coords"
    if total_genes <= n_cultivars:
        return "single_gene"
    if total_genes <= n_cultivars * 3:
        return "tandem"
    return "multi_copy"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--diff", required=True, help="Path to diff payload JSON")
    ap.add_argument("--coords-dir", required=True, help="Directory with og_gene_coords chunk_*.json")
    ap.add_argument("--top", type=int, default=50)
    ap.add_argument("--require-irgsp", action="store_true", default=True,
                    help="Only include OGs with representative.transcripts (default: on)")
    args = ap.parse_args()

    with open(args.diff) as f:
        payload = json.load(f)

    entries = payload.get("entries", [])
    if not entries:
        print(f"ERROR: No entries in {args.diff}", file=sys.stderr)
        sys.exit(1)

    print(f"Loaded {len(entries)} diff entries for trait={payload.get('traitId')}",
          file=sys.stderr)

    coords = load_all_coords(args.coords_dir)
    print(f"Loaded coords for {len(coords)} OGs", file=sys.stderr)

    candidates = []
    for e in entries:
        og_id = e["orthogroup"]
        if args.require_irgsp:
            rep = e.get("representative") or {}
            if not rep.get("transcripts"):
                continue
        cultivars = coords.get(og_id)
        if not cultivars:
            continue
        candidates.append({
            "og_id": og_id,
            "mean_diff": abs(e.get("meanDiff", 0.0)),
            "p_value": e.get("pValue", 1.0),
            "category": infer_category(cultivars),
        })

    candidates.sort(key=lambda x: (-x["mean_diff"], x["p_value"]))
    selected = candidates[: args.top]

    print(f"og_id\tcategory\tmeanDiff\tpValue")
    for c in selected:
        print(f"{c['og_id']}\t{c['category']}\t{c['mean_diff']:.4f}\t{c['p_value']:.4g}")

    print(f"Selected {len(selected)} of {len(candidates)} eligible", file=sys.stderr)


if __name__ == "__main__":
    main()

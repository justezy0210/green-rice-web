#!/usr/bin/env python3
"""
Step 0 + Step 1: Build ID crosswalk + cultivar gene coordinate index.

Runs on server where cultivar GFF3 files are available.

Usage:
  python3 build-gene-coords.py \
    --cultivar-gff-dir /path/to/results/ \
    --og-members-dir /path/to/og_members_chunks/ \
    --output /tmp/gene_coords_output/

Output:
  - crosswalk.json (ID mapping validation)
  - og_gene_coords/chunk_{NNN}.json (coordinate index)
"""

import argparse
import json
import os
import sys
from collections import defaultdict
from pathlib import Path
from urllib.parse import unquote

CULTIVARS = [
    "baegilmi", "chamdongjin", "chindeul", "hyeonpum",
    "jopyeong", "jungmo1024", "namchan", "namil",
    "pyeongwon", "saeilmi", "samgwang",
]


def parse_gff_gene_index(gff_path: str) -> dict[str, dict]:
    """Parse GFF3 → {geneId: {chr, start, end, strand}}."""
    genes = {}
    with open(gff_path) as f:
        for line in f:
            if line.startswith("#"):
                continue
            cols = line.rstrip().split("\t")
            if len(cols) < 9 or cols[2] != "gene":
                continue
            attrs = {}
            for pair in cols[8].split(";"):
                if "=" in pair:
                    k, v = pair.split("=", 1)
                    attrs[k.strip()] = unquote(v.strip())
            gene_id = attrs.get("ID", "")
            if gene_id:
                genes[gene_id] = {
                    "chr": cols[0],
                    "start": int(cols[3]),
                    "end": int(cols[4]),
                    "strand": cols[6],
                }
    return genes


def strip_transcript_suffix(gene_id: str) -> str:
    """baegilmi_g12345.t1 → baegilmi_g12345"""
    if ".t" in gene_id:
        return gene_id.rsplit(".t", 1)[0]
    return gene_id


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--cultivar-gff-dir", required=True)
    parser.add_argument("--og-members-dir", required=True,
                        help="Directory with chunk_NNN.json files (og-members)")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    os.makedirs(args.output, exist_ok=True)
    os.makedirs(os.path.join(args.output, "og_gene_coords"), exist_ok=True)

    # ─── Step 0: Parse cultivar GFF3s ───
    print("=== Step 0: Building ID crosswalk ===")
    cultivar_genes: dict[str, dict[str, dict]] = {}
    crosswalk = {}

    for cultivar in CULTIVARS:
        gff_path = os.path.join(args.cultivar_gff_dir, cultivar, f"{cultivar}.gff3")
        if not os.path.exists(gff_path):
            print(f"  WARNING: {gff_path} not found, skipping {cultivar}")
            continue
        genes = parse_gff_gene_index(gff_path)
        cultivar_genes[cultivar] = genes
        crosswalk[cultivar] = {
            "gff_path": gff_path,
            "gene_count": len(genes),
            "sample_gene_ids": list(genes.keys())[:5],
        }
        print(f"  {cultivar}: {len(genes)} genes")

    # ─── Step 1: Map OG members to coordinates ───
    print("\n=== Step 1: Building coordinate index ===")

    # Load all og-members chunks
    chunk_files = sorted(
        f for f in os.listdir(args.og_members_dir)
        if f.startswith("chunk_") and f.endswith(".json")
    )

    total_ogs = 0
    total_genes = 0
    matched = 0
    unmatched = 0
    unmatched_examples = []

    for chunk_file in chunk_files:
        chunk_path = os.path.join(args.og_members_dir, chunk_file)
        with open(chunk_path) as f:
            chunk_data = json.load(f)

        ogs = chunk_data.get("ogs", {})
        coord_chunk: dict[str, dict[str, list]] = {}

        for og_id, members in ogs.items():
            total_ogs += 1
            og_coords: dict[str, list] = {}

            for cultivar_id, gene_ids in members.items():
                if cultivar_id not in cultivar_genes:
                    continue
                gff_index = cultivar_genes[cultivar_id]

                for gene_id in gene_ids:
                    total_genes += 1
                    # Strip transcript suffix: baegilmi_g12345.t1 → baegilmi_g12345
                    bare_id = strip_transcript_suffix(gene_id)
                    gene_info = gff_index.get(bare_id)

                    if gene_info:
                        matched += 1
                        if cultivar_id not in og_coords:
                            og_coords[cultivar_id] = []
                        og_coords[cultivar_id].append({
                            "id": gene_id,
                            "chr": gene_info["chr"],
                            "start": gene_info["start"],
                            "end": gene_info["end"],
                            "strand": gene_info["strand"],
                        })
                    else:
                        unmatched += 1
                        if len(unmatched_examples) < 10:
                            unmatched_examples.append(
                                f"{cultivar_id}/{gene_id} (bare: {bare_id})"
                            )

            if og_coords:
                coord_chunk[og_id] = og_coords

        # Write coordinate chunk
        out_path = os.path.join(args.output, "og_gene_coords", chunk_file)
        with open(out_path, "w") as f:
            json.dump(coord_chunk, f)
        print(f"  {chunk_file}: {len(coord_chunk)} OGs with coords")

    # Crosswalk summary
    match_rate = matched / total_genes * 100 if total_genes > 0 else 0
    crosswalk["_summary"] = {
        "total_ogs": total_ogs,
        "total_genes": total_genes,
        "matched": matched,
        "unmatched": unmatched,
        "match_rate_pct": round(match_rate, 1),
        "unmatched_examples": unmatched_examples,
    }

    crosswalk_path = os.path.join(args.output, "crosswalk.json")
    with open(crosswalk_path, "w") as f:
        json.dump(crosswalk, f, indent=2)

    print(f"\n=== Summary ===")
    print(f"  OGs: {total_ogs}")
    print(f"  Genes: {total_genes}")
    print(f"  Matched: {matched} ({match_rate:.1f}%)")
    print(f"  Unmatched: {unmatched}")
    if unmatched_examples:
        print(f"  Unmatched examples: {unmatched_examples[:5]}")
    print(f"  Output: {args.output}")


if __name__ == "__main__":
    main()

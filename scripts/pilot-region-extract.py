#!/usr/bin/env python3
"""
Step 2.5 Pilot: Extract region data (graph + AF) for sample OGs.
Measures success rates, timing, and failure modes across different cluster types.

Usage (on server):
  python3 pilot-region-extract.py \
    --hal /path/to/full.hal \
    --gbz /path/to/graph.gbz \
    --vcf /path/to/variants.vcf.gz \
    --irgsp-gff /path/to/irgsp-1.0.gff \
    --gene-coords-dir /tmp/gene_coords_output/og_gene_coords/ \
    --og-descriptions /tmp/og_descriptions.json \
    --groupings /tmp/groupings.json \
    --output /tmp/pilot_output/ \
    --sample-size 100 \
    --flank 10000
"""

import argparse
import gzip
import json
import os
import re
import subprocess
import sys
import tempfile
import time
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _cultivars import pangenome_cultivars

CULTIVARS = pangenome_cultivars()

REF_GENOME = "IRGSP-1.0"
# GBZ uses "IRGSP-1" (no .0) in path names — confirmed via vg paths -L
GBZ_REF_SAMPLE = "IRGSP-1"
MAX_REGION_LENGTH = 200_000  # cap per pilot design


# ─────────────────────────────────────────────────────────────
# Cluster definition
# ─────────────────────────────────────────────────────────────

def cluster_genes(genes: list[dict], threshold: int = 25_000) -> list[dict]:
    """Group genes by cultivar+chr+proximity. Returns list of clusters."""
    by_chr = defaultdict(list)
    for g in genes:
        by_chr[g["chr"]].append(g)

    clusters = []
    for chrom, chr_genes in by_chr.items():
        chr_genes.sort(key=lambda x: x["start"])
        current = {"chr": chrom, "genes": [chr_genes[0]], "start": chr_genes[0]["start"], "end": chr_genes[0]["end"]}
        for g in chr_genes[1:]:
            if g["start"] - current["end"] <= threshold:
                current["genes"].append(g)
                current["end"] = max(current["end"], g["end"])
            else:
                clusters.append(current)
                current = {"chr": chrom, "genes": [g], "start": g["start"], "end": g["end"]}
        clusters.append(current)

    return clusters


# ─────────────────────────────────────────────────────────────
# Sample selection
# ─────────────────────────────────────────────────────────────

def pick_sample_ogs(
    og_coords: dict,
    og_descriptions: dict,
    sample_size: int,
) -> list[tuple[str, str]]:
    """Pick diverse sample: single/tandem/multi/no-IRGSP. Returns [(og_id, category)]."""
    single_gene = []
    tandem = []
    multi_copy = []
    no_irgsp = []

    for og_id, cultivars in og_coords.items():
        total_genes = sum(len(genes) for genes in cultivars.values())
        has_irgsp = og_id in og_descriptions and og_descriptions[og_id].get("transcripts")

        if not has_irgsp:
            no_irgsp.append(og_id)
            continue

        if total_genes <= len(cultivars):  # roughly 1 per cultivar
            single_gene.append(og_id)
        elif total_genes <= len(cultivars) * 3:
            tandem.append(og_id)
        else:
            multi_copy.append(og_id)

    per_category = sample_size // 4
    samples = []
    for ogs, cat in [
        (single_gene, "single_gene"),
        (tandem, "tandem"),
        (multi_copy, "multi_copy"),
        (no_irgsp, "no_irgsp"),
    ]:
        for og_id in ogs[:per_category]:
            samples.append((og_id, cat))
    return samples


# ─────────────────────────────────────────────────────────────
# halLiftover
# ─────────────────────────────────────────────────────────────

def hal_liftover(
    hal_path: str,
    src_genome: str,
    tgt_genome: str,
    chrom: str,
    start: int,
    end: int,
    hal_liftover_bin: str = "halLiftover",
) -> list[dict]:
    with tempfile.NamedTemporaryFile(mode="w", suffix=".bed", delete=False) as bed_in:
        bed_in.write(f"{chrom}\t{start}\t{end}\tq\t0\t+\n")
        in_path = bed_in.name
    out_path = in_path + ".out"
    try:
        result = subprocess.run(
            [hal_liftover_bin, hal_path, src_genome, in_path, tgt_genome, out_path],
            capture_output=True, text=True, timeout=30,
        )
        if result.returncode != 0:
            return []
        regions = []
        if os.path.exists(out_path):
            with open(out_path) as f:
                for line in f:
                    cols = line.rstrip().split("\t")
                    if len(cols) >= 3:
                        regions.append({
                            "chr": cols[0],
                            "start": int(cols[1]),
                            "end": int(cols[2]),
                            "strand": cols[5] if len(cols) > 5 else "+",
                        })
        return regions
    finally:
        os.unlink(in_path)
        if os.path.exists(out_path):
            os.unlink(out_path)


def merge_intervals(intervals: list[dict]) -> dict | None:
    """Merge overlapping intervals on same chr. Returns {chr, start, end, coverage}."""
    if not intervals:
        return None
    by_chr = defaultdict(list)
    for iv in intervals:
        by_chr[iv["chr"]].append(iv)
    # Largest chromosome group
    chrom, ivs = max(by_chr.items(), key=lambda x: sum(iv["end"] - iv["start"] for iv in x[1]))
    ivs.sort(key=lambda x: x["start"])
    merged = [dict(ivs[0])]
    for iv in ivs[1:]:
        if iv["start"] <= merged[-1]["end"] + 1000:
            merged[-1]["end"] = max(merged[-1]["end"], iv["end"])
        else:
            merged.append(dict(iv))
    total_len = sum(m["end"] - m["start"] for m in merged)
    span_start = merged[0]["start"]
    span_end = merged[-1]["end"]
    span_len = span_end - span_start
    return {
        "chr": chrom,
        "start": span_start,
        "end": span_end,
        "coverage": total_len / span_len if span_len > 0 else 0,
        "segment_count": len(merged),
    }


# ─────────────────────────────────────────────────────────────
# vg chunk → subgraph JSON
# ─────────────────────────────────────────────────────────────

def extract_subgraph(
    gbz_path: str,
    path_name: str,
    start: int,
    end: int,
    vg_bin: str = "vg",
) -> dict | None:
    """Extract subgraph as simplified JSON."""
    try:
        chunk_result = subprocess.run(
            [vg_bin, "chunk", "-x", gbz_path, "-p", f"{path_name}:{start}-{end}", "-c", "1", "-T"],
            capture_output=True, timeout=60,
        )
        if chunk_result.returncode != 0 or not chunk_result.stdout:
            return None
        view_result = subprocess.run(
            [vg_bin, "view", "-j", "-"],
            input=chunk_result.stdout, capture_output=True, timeout=30,
        )
        if view_result.returncode != 0:
            return None
        data = json.loads(view_result.stdout)

        nodes = [
            {"id": str(n["id"]), "seq": n.get("sequence", ""), "len": len(n.get("sequence", ""))}
            for n in data.get("node", [])
        ]
        edges = [
            {"from": str(e["from"]), "to": str(e["to"])}
            for e in data.get("edge", [])
        ]
        paths = []
        for p in data.get("path", []):
            visits = [
                {"nodeId": str(m["position"]["node_id"]), "reverse": m["position"].get("is_reverse", False)}
                for m in p.get("mapping", [])
            ]
            paths.append({"name": p["name"], "visits": visits})

        return {"nodes": nodes, "edges": edges, "paths": paths}
    except (subprocess.TimeoutExpired, json.JSONDecodeError):
        return None


# ─────────────────────────────────────────────────────────────
# VCF variant extraction
# ─────────────────────────────────────────────────────────────

def parse_gt(gt_str: str) -> tuple[int, int]:
    alleles = re.split(r"[/|]", gt_str)
    ref_c = alt_c = 0
    for a in alleles:
        if a == "." or a == "":
            continue
        if a == "0":
            ref_c += 1
        else:
            alt_c += 1
    return ref_c, alt_c


def extract_variants_af(
    vcf_path: str,
    chrom: str,
    start: int,
    end: int,
    group_members: dict[str, list[str]],
) -> list[dict]:
    """Extract variants in region and compute group AF."""
    variants = []
    samples = []
    with gzip.open(vcf_path, "rt") as f:
        for line in f:
            if line.startswith("##"):
                continue
            if line.startswith("#CHROM"):
                samples = line.strip().split("\t")[9:]
                continue
            cols = line.strip().split("\t")
            if len(cols) < 10:
                continue
            if cols[0] != chrom:
                # Skip non-matching chr (naive; ideally use tabix)
                continue
            pos = int(cols[1])
            if pos < start:
                continue
            if pos > end:
                break  # assumes sorted

            gts = {samples[i]: cols[9 + i].split(":")[0] for i in range(len(samples))}

            af_by_group = {}
            counts_by_group = {}
            for grp, members in group_members.items():
                total = alt = 0
                for s in members:
                    gt = gts.get(s, "./.")
                    if gt == "./." or gt == ".":
                        continue
                    r, a = parse_gt(gt)
                    total += r + a
                    alt += a
                af_by_group[grp] = alt / total if total > 0 else 0.0
                counts_by_group[grp] = {"ref": total - alt, "alt": alt, "total": total}

            afs = list(af_by_group.values())
            delta_af = max(afs) - min(afs) if len(afs) >= 2 else 0.0

            variants.append({
                "chr": cols[0],
                "pos": pos,
                "ref": cols[3][:20],  # truncate long indels
                "alt": cols[4][:20],
                "afByGroup": {k: round(v, 4) for k, v in af_by_group.items()},
                "countsByGroup": counts_by_group,
                "deltaAf": round(delta_af, 4),
            })
    return variants


# ─────────────────────────────────────────────────────────────
# Path lookup (pre-load all cultivar chromosome paths from GBZ)
# ─────────────────────────────────────────────────────────────

def load_all_paths(gbz_path: str, vg_bin: str) -> dict[tuple[str, str], list[tuple[int, str]]]:
    """
    Returns: {(sample, chr): [(phase_block_start, full_path_name), ...]} sorted by start.
    Path naming: {sample}#0#{chr}#{phase_block_start}  (IRGSP-1 reference has no #start)
    """
    result = subprocess.run(
        [vg_bin, "paths", "-x", gbz_path, "-L"],
        capture_output=True, text=True, timeout=120,
    )
    if result.returncode != 0:
        raise RuntimeError(f"vg paths failed: {result.stderr[:200]}")

    paths: dict[tuple[str, str], list[tuple[int, str]]] = defaultdict(list)
    for line in result.stdout.splitlines():
        parts = line.split("#")
        if len(parts) < 3:
            continue
        sample = parts[0]
        chrom = parts[2]
        # Reference path: IRGSP-1#0#chr01 (no phase block suffix)
        if len(parts) == 3:
            paths[(sample, chrom)].append((0, line))
        else:
            try:
                start = int(parts[3])
                paths[(sample, chrom)].append((start, line))
            except ValueError:
                continue

    for key in paths:
        paths[key].sort(key=lambda x: x[0])
    return dict(paths)


def pick_path(
    all_paths: dict[tuple[str, str], list[tuple[int, str]]],
    sample: str,
    chrom: str,
    target_start: int,
) -> tuple[str, int] | None:
    """
    Pick the path whose phase_block_start ≤ target_start.
    Returns (path_name, block_start) so caller can convert target_start to local coord.
    """
    key = (sample, chrom)
    if key not in all_paths:
        return None
    result = None
    for block_start, path_name in all_paths[key]:
        if block_start <= target_start:
            result = (path_name, block_start)
        else:
            break
    return result


# ─────────────────────────────────────────────────────────────
# Main pilot
# ─────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--hal", required=True)
    parser.add_argument("--gbz", required=True)
    parser.add_argument("--vcf", required=True)
    parser.add_argument("--irgsp-gff", required=True)
    parser.add_argument("--gene-coords-dir", required=True)
    parser.add_argument("--og-descriptions", required=True)
    parser.add_argument("--groupings", required=True,
                        help="JSON: {traitId: {groupLabel: [cultivarIds]}}")
    parser.add_argument("--trait", default="heading_date")
    parser.add_argument("--output", required=True)
    parser.add_argument("--sample-size", type=int, default=100)
    parser.add_argument("--flank", type=int, default=10_000)
    parser.add_argument("--cluster-threshold", type=int, default=25_000)
    parser.add_argument("--hal-bin-dir", default=os.path.expanduser("~/cactus-bin/bin"))
    args = parser.parse_args()

    os.makedirs(args.output, exist_ok=True)
    hal_liftover_bin = os.path.join(args.hal_bin_dir, "halLiftover")
    vg_bin = os.path.join(args.hal_bin_dir, "vg")

    # Pre-load all path names from GBZ
    print("Loading GBZ path metadata...")
    all_paths = load_all_paths(args.gbz, vg_bin)
    print(f"  Loaded paths for {len(all_paths)} (sample, chr) pairs", flush=True)

    # Load data
    print("Loading coordinate index...", flush=True)
    og_coords = {}
    for f in sorted(os.listdir(args.gene_coords_dir)):
        if f.endswith(".json"):
            with open(os.path.join(args.gene_coords_dir, f)) as fh:
                og_coords.update(json.load(fh))
    print(f"  {len(og_coords)} OGs with coords")

    print("Loading OG descriptions...")
    with open(args.og_descriptions) as f:
        og_descriptions = json.load(f)

    print("Loading groupings...")
    with open(args.groupings) as f:
        all_groupings = json.load(f)
    group_members = all_groupings.get(args.trait, {})
    if not group_members:
        print(f"ERROR: No groupings for trait {args.trait}")
        sys.exit(1)
    print(f"  {args.trait}: {list(group_members.keys())}")

    # Pick sample
    samples = pick_sample_ogs(og_coords, og_descriptions, args.sample_size)
    print(f"\nSample: {len(samples)} OGs")
    category_counts = defaultdict(int)
    for _, cat in samples:
        category_counts[cat] += 1
    for cat, n in category_counts.items():
        print(f"  {cat}: {n}")

    # Process each sample
    results = []
    stats = defaultdict(int)
    start_time = time.time()

    for i, (og_id, category) in enumerate(samples):
        og_start = time.time()
        cultivars_data = og_coords.get(og_id, {})

        # Pick anchor cultivar: prefer IRGSP via baegilmi as a consistent default
        anchor_cultivar = None
        for c in ["baegilmi", "chamdongjin"] + CULTIVARS:
            if c in cultivars_data:
                anchor_cultivar = c
                break
        if not anchor_cultivar:
            stats["no_anchor_cultivar"] += 1
            continue

        # Cluster genes for anchor
        clusters = cluster_genes(cultivars_data[anchor_cultivar], args.cluster_threshold)
        if not clusters:
            stats["no_clusters"] += 1
            continue

        cluster = clusters[0]  # pilot: just take first cluster
        region_start = max(0, cluster["start"] - args.flank)
        region_end = cluster["end"] + args.flank
        if region_end - region_start > MAX_REGION_LENGTH:
            region_end = region_start + MAX_REGION_LENGTH

        # halLiftover to IRGSP
        lift_start = time.time()
        lifted = hal_liftover(
            args.hal, anchor_cultivar, REF_GENOME,
            cluster["chr"], region_start, region_end,
            hal_liftover_bin,
        )
        lift_time = time.time() - lift_start
        lift_merged = merge_intervals(lifted)

        # Dynamically pick the cultivar path covering this region
        pick = pick_path(all_paths, anchor_cultivar, cluster["chr"], region_start)

        # vg chunk for subgraph (convert to local coords within phase block)
        chunk_start = time.time()
        graph = None
        if pick:
            path_name, block_start = pick
            local_start = region_start - block_start
            local_end = region_end - block_start
            if local_start >= 0:
                graph = extract_subgraph(args.gbz, path_name, local_start, local_end, vg_bin)
        else:
            stats["no_path_found"] += 1
        chunk_time = time.time() - chunk_start

        # VCF extraction (if liftover succeeded)
        vcf_time = 0
        variants = []
        if lift_merged and lift_merged["coverage"] >= 0.5:
            vcf_start = time.time()
            variants = extract_variants_af(
                args.vcf, lift_merged["chr"], lift_merged["start"], lift_merged["end"],
                group_members,
            )
            vcf_time = time.time() - vcf_start
            stats["liftover_ok"] += 1
        else:
            stats["liftover_failed"] += 1

        if graph:
            stats["graph_ok"] += 1
        else:
            stats["graph_failed"] += 1

        if variants:
            stats["variants_found"] += 1

        total_time = time.time() - og_start
        result = {
            "ogId": og_id,
            "category": category,
            "anchorCultivar": anchor_cultivar,
            "clusterGenes": len(cluster["genes"]),
            "regionSpan": region_end - region_start,
            "liftoverStatus": "ok" if lift_merged and lift_merged["coverage"] >= 0.5 else "failed",
            "liftoverCoverage": lift_merged["coverage"] if lift_merged else 0,
            "graphStatus": "ok" if graph else "failed",
            "graphNodes": len(graph["nodes"]) if graph else 0,
            "graphPaths": len(graph["paths"]) if graph else 0,
            "variantCount": len(variants),
            "timeLiftover": round(lift_time, 2),
            "timeChunk": round(chunk_time, 2),
            "timeVcf": round(vcf_time, 2),
            "timeTotal": round(total_time, 2),
        }
        results.append(result)

        if (i + 1) % 10 == 0:
            elapsed = time.time() - start_time
            rate = (i + 1) / elapsed
            print(f"  {i+1}/{len(samples)} processed ({rate:.2f}/s, "
                  f"liftover_ok={stats['liftover_ok']}, graph_ok={stats['graph_ok']})")

    elapsed = time.time() - start_time

    # Report
    report = {
        "sampleSize": len(samples),
        "elapsedSeconds": round(elapsed, 1),
        "avgPerOg": round(elapsed / len(results), 2) if results else 0,
        "stats": dict(stats),
        "categoryCounts": dict(category_counts),
        "results": results,
    }
    report_path = os.path.join(args.output, "pilot_report.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    print(f"\n=== Pilot Report ===")
    print(f"Sample size: {len(samples)}")
    print(f"Elapsed: {elapsed:.1f}s ({elapsed/len(results):.2f}s/OG avg)")
    print(f"Stats:")
    for k, v in stats.items():
        print(f"  {k}: {v}")
    print(f"\nReport: {report_path}")


if __name__ == "__main__":
    main()

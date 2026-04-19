#!/usr/bin/env python3
"""
Batch extraction of per-cluster region data (graph + AF) for candidate OGs.

Derived from pilot-region-extract.py. Differences:
- Takes a candidate OG list (TSV from select-candidate-ogs.py) instead of auto-sampling.
- Iterates ALL clusters per OG (up to --cluster-cap).
- Writes one JSON per cluster: og_region/{ogId}/{clusterId}.json (schema v1).
- Emits og_region/_manifest.json with per-OG/per-cluster status summary.

Usage:
  python3 scripts/batch-region-extract.py \\
    --candidates /tmp/candidates_heading_date.tsv \\
    --hal /path/to/full.hal \\
    --gbz /path/to/graph.gbz \\
    --vcf /path/to/variants.vcf.gz \\
    --gene-coords-dir /path/to/og_gene_coords/ \\
    --groupings /path/to/groupings.json \\
    --trait heading_date \\
    --output /tmp/og_region_output/ \\
    --flank 10000 \\
    --cluster-cap 5
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
GBZ_REF_SAMPLE = "IRGSP-1"
MAX_REGION_LENGTH = 200_000
SCHEMA_VERSION = 1


# ─────────────────────────────────────────────────────────────
# Cluster definition (mirrors pilot + src/lib/og-gene-clusters.ts)
# ─────────────────────────────────────────────────────────────

def cluster_genes(genes: list, threshold: int = 25_000) -> list:
    by_chr = defaultdict(list)
    for g in genes:
        by_chr[g["chr"]].append(g)

    clusters = []
    for chrom, chr_genes in by_chr.items():
        chr_genes.sort(key=lambda x: x["start"])
        current = {"chr": chrom, "genes": [chr_genes[0]],
                   "start": chr_genes[0]["start"], "end": chr_genes[0]["end"]}
        for g in chr_genes[1:]:
            if g["start"] - current["end"] <= threshold:
                current["genes"].append(g)
                current["end"] = max(current["end"], g["end"])
            else:
                clusters.append(current)
                current = {"chr": chrom, "genes": [g], "start": g["start"], "end": g["end"]}
        clusters.append(current)

    return clusters


def classify_cluster_kind(cultivar_clusters: list) -> str:
    """
    kind classification that matches src/lib/og-gene-clusters.ts:
    - 'singleton' if 1 gene
    - 'tandem' if multiple genes in one cluster
    - 'dispersed' if multiple clusters exist for this cultivar
    Caller decides based on whole-cultivar cluster count + this cluster's gene count.
    """
    raise NotImplementedError  # handled inline below


def cluster_id(cultivar: str, chrom: str, start: int) -> str:
    return f"{cultivar}_{chrom}_{start}"


# ─────────────────────────────────────────────────────────────
# halLiftover
# ─────────────────────────────────────────────────────────────

def hal_liftover(hal_path, src_genome, tgt_genome, chrom, start, end, hal_bin):
    with tempfile.NamedTemporaryFile(mode="w", suffix=".bed", delete=False) as bed_in:
        bed_in.write(f"{chrom}\t{start}\t{end}\tq\t0\t+\n")
        in_path = bed_in.name
    out_path = in_path + ".out"
    try:
        result = subprocess.run(
            [hal_bin, hal_path, src_genome, in_path, tgt_genome, out_path],
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


def merge_intervals(intervals):
    if not intervals:
        return None
    by_chr = defaultdict(list)
    for iv in intervals:
        by_chr[iv["chr"]].append(iv)
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
# vg chunk → subgraph
# ─────────────────────────────────────────────────────────────

def extract_subgraph(gbz_path, anchor_path_name, anchor_start, anchor_end,
                     cohort_path_ranges, vg_bin, tmp_root=None):
    """
    Extract subgraph via `vg chunk -P` so that all cohort cultivar paths keep
    their names. The anchor chunk file contains all overlapping cohort paths
    within the reach of -c (context steps).

    cohort_path_ranges: list of (path_name, local_start, local_end) for every
    cultivar (including anchor) that overlaps this region. Reference (IRGSP) is
    included automatically by vg since it's a reference path in the GBZ.
    """
    if not cohort_path_ranges:
        return None

    tmp_dir = tempfile.mkdtemp(prefix="og_chunk_", dir=tmp_root)
    paths_file = os.path.join(tmp_dir, "paths.txt")
    prefix = os.path.join(tmp_dir, "chunk")
    try:
        with open(paths_file, "w") as f:
            for name, s, e in cohort_path_ranges:
                f.write(f"{name}:{s}-{e}\n")

        chunk_result = subprocess.run(
            [vg_bin, "chunk", "-x", gbz_path,
             "-P", paths_file,
             "-c", "3", "-l", "30000",
             "-b", prefix],
            capture_output=True, timeout=180,
        )
        if chunk_result.returncode != 0:
            return None

        # Pick the anchor's chunk file (contains every cohort path we asked for).
        anchor_safe = anchor_path_name.replace("#", "#")
        candidates = [f for f in os.listdir(tmp_dir)
                      if f.endswith(".vg") and anchor_safe in f]
        if not candidates:
            vg_files = [f for f in os.listdir(tmp_dir) if f.endswith(".vg")]
            if not vg_files:
                return None
            candidates = vg_files
        chunk_path = os.path.join(tmp_dir, candidates[0])

        view_result = subprocess.run(
            [vg_bin, "view", "-j", chunk_path],
            capture_output=True, timeout=60,
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
                {"nodeId": str(m["position"]["node_id"]),
                 "reverse": m["position"].get("is_reverse", False)}
                for m in p.get("mapping", [])
            ]
            paths.append({"name": p["name"], "visits": visits})

        return {"nodes": nodes, "edges": edges, "paths": paths}
    except (subprocess.TimeoutExpired, json.JSONDecodeError):
        return None
    finally:
        import shutil
        shutil.rmtree(tmp_dir, ignore_errors=True)
    # unused: anchor_start/end retained for API consistency
    _ = (anchor_start, anchor_end)


# ─────────────────────────────────────────────────────────────
# VCF variant extraction
# ─────────────────────────────────────────────────────────────

def parse_gt(gt_str):
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


def extract_variants_af(vcf_path, chrom, start, end, group_members):
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
                continue
            pos = int(cols[1])
            if pos < start:
                continue
            if pos > end:
                break

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
                "ref": cols[3][:20],
                "alt": cols[4][:20],
                "afByGroup": {k: round(v, 4) for k, v in af_by_group.items()},
                "countsByGroup": counts_by_group,
                "deltaAf": round(delta_af, 4),
            })
    return variants


# ─────────────────────────────────────────────────────────────
# GBZ path metadata
# ─────────────────────────────────────────────────────────────

def load_all_paths(gbz_path, vg_bin):
    result = subprocess.run(
        [vg_bin, "paths", "-x", gbz_path, "-L"],
        capture_output=True, text=True, timeout=120,
    )
    if result.returncode != 0:
        raise RuntimeError(f"vg paths failed: {result.stderr[:200]}")

    paths = defaultdict(list)
    for line in result.stdout.splitlines():
        parts = line.split("#")
        if len(parts) < 3:
            continue
        sample = parts[0]
        chrom = parts[2]
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


def pick_path(all_paths, sample, chrom, target_start):
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


def collect_cohort_paths_via_liftover(
    all_paths, hal_path, hal_bin,
    anchor_cultivar, chrom,
    anchor_region_start, anchor_region_end,
):
    """
    Build the -P cohort ranges using halLiftover to map the anchor region into
    each cultivar's coordinate space. This avoids syntenic drift that can cause
    a cultivar's actual path to sit outside a coord-approximated range, which
    previously split that cultivar's path into two disjoint segments in the
    extracted subgraph.

    Returns list of (path_name, local_start, local_end). IRGSP is auto-included
    by vg chunk since it is a reference path in the GBZ.
    """
    cohort = []

    # Anchor: direct mapping — no liftover needed
    anchor_pick = pick_path(all_paths, anchor_cultivar, chrom, anchor_region_start)
    if anchor_pick is not None:
        path_name, block_start = anchor_pick
        ls = max(0, anchor_region_start - block_start)
        le = max(ls + 1, anchor_region_end - block_start)
        cohort.append((path_name, ls, le))

    for sample in CULTIVARS:
        if sample == anchor_cultivar:
            continue
        lifted = hal_liftover(
            hal_path, anchor_cultivar, sample, chrom,
            anchor_region_start, anchor_region_end, hal_bin,
        )
        merged = merge_intervals(lifted)
        if not merged:
            continue
        pick = pick_path(all_paths, sample, merged["chr"], merged["start"])
        if pick is None:
            key = (sample, merged["chr"])
            if key not in all_paths or not all_paths[key]:
                continue
            block_start, path_name = all_paths[key][0]
        else:
            path_name, block_start = pick
        ls = max(0, merged["start"] - block_start)
        le = max(ls + 1, merged["end"] - block_start)
        # Small pad to absorb liftover interval splits
        pad = max((le - ls) // 10, 2000)
        ls = max(0, ls - pad)
        le = le + pad
        cohort.append((path_name, ls, le))
    return cohort


# ─────────────────────────────────────────────────────────────
# Anchor cultivar selection (prefer cultivars likely to have good liftover)
# ─────────────────────────────────────────────────────────────

ANCHOR_PRIORITY = ["baegilmi", "chamdongjin", "samgwang"] + [
    c for c in CULTIVARS if c not in {"baegilmi", "chamdongjin", "samgwang"}
]


def pick_anchor_cultivar(cultivars_data: dict) -> str | None:
    for c in ANCHOR_PRIORITY:
        if c in cultivars_data and cultivars_data[c]:
            return c
    return None


# ─────────────────────────────────────────────────────────────
# Per-cluster extraction
# ─────────────────────────────────────────────────────────────

def extract_one_cluster(
    og_id: str,
    anchor_cultivar: str,
    cluster: dict,
    kind: str,
    all_paths: dict,
    hal_path: str,
    gbz_path: str,
    vcf_path: str,
    group_members: dict,
    flank: int,
    hal_bin: str,
    vg_bin: str,
) -> dict:
    """Run halLiftover + vg chunk + VCF AF for one cluster. Returns RegionData schema v1."""
    region_start = max(0, cluster["start"] - flank)
    region_end = cluster["end"] + flank
    if region_end - region_start > MAX_REGION_LENGTH:
        region_end = region_start + MAX_REGION_LENGTH

    cid = cluster_id(anchor_cultivar, cluster["chr"], cluster["start"])

    # halLiftover
    lifted = hal_liftover(
        hal_path, anchor_cultivar, REF_GENOME,
        cluster["chr"], region_start, region_end, hal_bin,
    )
    lift_merged = merge_intervals(lifted)

    liftover_status = "unmapped"
    irgsp_region = None
    coverage = 0.0
    if lift_merged:
        coverage = lift_merged["coverage"]
        irgsp_region = {
            "chr": lift_merged["chr"],
            "start": lift_merged["start"],
            "end": lift_merged["end"],
        }
        if coverage >= 0.8:
            liftover_status = "mapped"
        elif coverage >= 0.5:
            liftover_status = "partial"
        else:
            liftover_status = "partial"  # still usable

    # vg chunk with multi-path (-P) + liftover-based cohort ranges so every
    # cultivar's actual path is covered, not just a syntenic approximation.
    graph = None
    anchor_pick = pick_path(all_paths, anchor_cultivar, cluster["chr"], region_start)
    if anchor_pick:
        anchor_path_name, anchor_block_start = anchor_pick
        anchor_local_start = max(0, region_start - anchor_block_start)
        anchor_local_end = region_end - anchor_block_start
        cohort = collect_cohort_paths_via_liftover(
            all_paths, hal_path, hal_bin,
            anchor_cultivar, cluster["chr"],
            region_start, region_end,
        )
        if anchor_local_start < anchor_local_end and cohort:
            graph = extract_subgraph(
                gbz_path, anchor_path_name,
                anchor_local_start, anchor_local_end,
                cohort, vg_bin,
            )

    graph_status = "ok" if graph and graph["nodes"] else ("empty" if graph else "error")

    # VCF AF (only if liftover usable)
    variants = []
    af_status = "unmapped"
    if lift_merged and coverage >= 0.5:
        variants = extract_variants_af(
            vcf_path, lift_merged["chr"], lift_merged["start"], lift_merged["end"],
            group_members,
        )
        af_status = "ok" if variants else "no_variants"

    return {
        "schemaVersion": SCHEMA_VERSION,
        "ogId": og_id,
        "clusterId": cid,
        "source": "cultivar-anchor",
        "anchor": {
            "cultivar": anchor_cultivar,
            "kind": kind,
            "genes": cluster["genes"],
            "regionSpan": {
                "chr": cluster["chr"],
                "start": region_start,
                "end": region_end,
            },
            "flankBp": flank,
        },
        "liftover": {
            "status": liftover_status,
            "irgspRegion": irgsp_region,
            "coverage": round(coverage, 4),
        },
        "graph": graph,
        "alleleFrequency": {
            "groupLabels": list(group_members.keys()),
            "variants": variants,
        } if variants else None,
        "status": {
            "graph": graph_status,
            "af": af_status,
        },
    }


# ─────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────

def load_candidates(tsv_path: str) -> list:
    rows = []
    with open(tsv_path) as f:
        header = f.readline().strip().split("\t")
        for line in f:
            cols = line.rstrip("\n").split("\t")
            if len(cols) < 1 or not cols[0].startswith("OG"):
                continue
            rows.append(dict(zip(header, cols)))
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--candidates", required=True,
                    help="TSV from select-candidate-ogs.py (og_id\\tcategory\\t...)")
    ap.add_argument("--hal", required=True)
    ap.add_argument("--gbz", required=True)
    ap.add_argument("--vcf", required=True)
    ap.add_argument("--gene-coords-dir", required=True)
    ap.add_argument("--groupings", required=True,
                    help="JSON: {traitId: {groupLabel: [cultivarIds]}}")
    ap.add_argument("--trait", default="heading_date")
    ap.add_argument("--output", required=True,
                    help="Output directory (will contain OG subdirs + _manifest.json)")
    ap.add_argument("--flank", type=int, default=10_000)
    ap.add_argument("--cluster-threshold", type=int, default=25_000)
    ap.add_argument("--cluster-cap", type=int, default=5,
                    help="Max clusters per OG (largest-first)")
    ap.add_argument("--hal-bin-dir", default=os.path.expanduser("~/cactus-bin/bin"))
    args = ap.parse_args()

    os.makedirs(args.output, exist_ok=True)
    hal_bin = os.path.join(args.hal_bin_dir, "halLiftover")
    vg_bin = os.path.join(args.hal_bin_dir, "vg")

    print("Loading GBZ path metadata...", flush=True)
    all_paths = load_all_paths(args.gbz, vg_bin)
    print(f"  {len(all_paths)} (sample, chr) pairs", flush=True)

    print("Loading coordinate index...", flush=True)
    og_coords = {}
    for f in sorted(os.listdir(args.gene_coords_dir)):
        if f.endswith(".json"):
            with open(os.path.join(args.gene_coords_dir, f)) as fh:
                og_coords.update(json.load(fh))
    print(f"  {len(og_coords)} OGs with coords", flush=True)

    with open(args.groupings) as f:
        all_groupings = json.load(f)
    group_members = all_groupings.get(args.trait, {})
    if not group_members:
        print(f"ERROR: trait {args.trait} not in groupings", file=sys.stderr)
        sys.exit(1)
    print(f"  trait={args.trait} groups={list(group_members.keys())}", flush=True)

    candidates = load_candidates(args.candidates)
    print(f"Loaded {len(candidates)} candidate OGs", flush=True)

    manifest = {
        "schemaVersion": SCHEMA_VERSION,
        "trait": args.trait,
        "clusterThreshold": args.cluster_threshold,
        "flankBp": args.flank,
        "clusterCap": args.cluster_cap,
        "ogs": {},
    }

    start_time = time.time()
    total_clusters = 0
    ok_clusters = 0

    for i, row in enumerate(candidates):
        og_id = row["og_id"]
        cultivars_data = og_coords.get(og_id, {})
        if not cultivars_data:
            manifest["ogs"][og_id] = {"error": "no_coords", "clusters": []}
            continue

        anchor = pick_anchor_cultivar(cultivars_data)
        if not anchor:
            manifest["ogs"][og_id] = {"error": "no_anchor_cultivar", "clusters": []}
            continue

        clusters = cluster_genes(cultivars_data[anchor], args.cluster_threshold)
        if not clusters:
            manifest["ogs"][og_id] = {"error": "no_clusters", "clusters": []}
            continue

        clusters.sort(key=lambda c: -len(c["genes"]))
        truncated = len(clusters) > args.cluster_cap
        clusters = clusters[: args.cluster_cap]

        og_dir = os.path.join(args.output, og_id)
        os.makedirs(og_dir, exist_ok=True)

        cluster_entries = []
        og_anchor_kind_map = "dispersed" if len(clusters) > 1 else None

        for cluster in clusters:
            if og_anchor_kind_map == "dispersed":
                kind = "dispersed"
            else:
                kind = "tandem" if len(cluster["genes"]) > 1 else "singleton"

            try:
                region_data = extract_one_cluster(
                    og_id, anchor, cluster, kind, all_paths,
                    args.hal, args.gbz, args.vcf, group_members,
                    args.flank, hal_bin, vg_bin,
                )
            except Exception as ex:
                manifest["ogs"].setdefault(og_id, {"clusters": []})
                cluster_entries.append({
                    "clusterId": cluster_id(anchor, cluster["chr"], cluster["start"]),
                    "status": "error",
                    "errorMessage": str(ex)[:300],
                })
                continue

            out_path = os.path.join(og_dir, f"{region_data['clusterId']}.json")
            with open(out_path, "w") as f:
                json.dump(region_data, f, separators=(",", ":"))

            total_clusters += 1
            if region_data["status"]["graph"] == "ok":
                ok_clusters += 1

            cluster_entries.append({
                "clusterId": region_data["clusterId"],
                "cultivar": anchor,
                "chr": cluster["chr"],
                "start": cluster["start"],
                "end": cluster["end"],
                "geneCount": len(cluster["genes"]),
                "kind": kind,
                "graphStatus": region_data["status"]["graph"],
                "afStatus": region_data["status"]["af"],
                "variantCount": len(region_data.get("alleleFrequency", {}).get("variants", []))
                    if region_data.get("alleleFrequency") else 0,
            })

        manifest["ogs"][og_id] = {
            "anchorCultivar": anchor,
            "clusters": cluster_entries,
            "truncated": truncated,
        }

        if (i + 1) % 10 == 0:
            elapsed = time.time() - start_time
            print(f"  {i+1}/{len(candidates)} OGs · "
                  f"{total_clusters} clusters · ok={ok_clusters} · "
                  f"{elapsed:.1f}s elapsed", flush=True)

    manifest["totalClusters"] = total_clusters
    manifest["okClusters"] = ok_clusters
    manifest["elapsedSeconds"] = round(time.time() - start_time, 1)

    manifest_path = os.path.join(args.output, "_manifest.json")
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)

    print(f"\n=== Batch complete ===")
    print(f"OGs processed:  {len(candidates)}")
    print(f"Clusters total: {total_clusters}")
    print(f"Clusters ok:    {ok_clusters}")
    print(f"Elapsed:        {manifest['elapsedSeconds']}s")
    print(f"Manifest:       {manifest_path}")


if __name__ == "__main__":
    main()

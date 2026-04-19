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
from _reference import IRGSP_DISPLAY_NAME, IRGSP_SAMPLE_ID

CULTIVARS = pangenome_cultivars()

REF_GENOME = IRGSP_DISPLAY_NAME
GBZ_REF_SAMPLE = IRGSP_SAMPLE_ID
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

def extract_cluster_graph(
    og_id: str,
    anchor_cultivar: str,
    cluster: dict,
    kind: str,
    all_paths: dict,
    hal_path: str,
    gbz_path: str,
    flank: int,
    hal_bin: str,
    vg_bin: str,
    orthofinder_version: int,
) -> tuple[dict, dict | None]:
    """Run halLiftover + vg chunk. Returns (RegionDataGraph v2, liftover_merged | None).

    The liftover result is returned alongside so the per-trait AF step can
    reuse the IRGSP region without re-running halLiftover.
    """
    lift_merged, anchor_region = _compute_liftover(
        anchor_cultivar, cluster, flank, hal_path, hal_bin,
    )
    region_start, region_end = anchor_region

    cid = cluster_id(anchor_cultivar, cluster["chr"], cluster["start"])

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
        liftover_status = "mapped" if coverage >= 0.8 else "partial"

    graph, graph_reason = _extract_graph_body(
        anchor_cultivar, cluster, region_start, region_end,
        all_paths, hal_path, hal_bin, gbz_path, vg_bin,
    )
    graph_status = "ok" if graph and graph["nodes"] else ("empty" if graph else "error")

    return {
        "schemaVersion": 2,
        "ogId": og_id,
        "clusterId": cid,
        "orthofinderVersion": orthofinder_version,
        "source": "cultivar-anchor",
        "anchor": {
            "cultivar": anchor_cultivar,
            "kind": kind,
            "genes": cluster["genes"],
            "regionSpan": {"chr": cluster["chr"], "start": region_start, "end": region_end},
            "flankBp": flank,
        },
        "liftover": {
            "status": liftover_status,
            "irgspRegion": irgsp_region,
            "coverage": round(coverage, 4),
        },
        "graph": graph,
        "status": {
            "graph": graph_status,
            "reasonCode": graph_reason,
        },
    }, lift_merged


def extract_cluster_af(
    og_id: str,
    cluster_cid: str,
    trait: str,
    group_members: dict,
    lift_merged: dict | None,
    vcf_path: str,
    orthofinder_version: int,
    grouping_version: int,
) -> dict:
    """AF for one (cluster, trait). Requires prior graph run for lift_merged."""
    variants: list = []
    af_status = "unmapped"
    reason = "COVERAGE_TOO_LOW"
    if lift_merged and lift_merged["coverage"] >= 0.5:
        try:
            variants = extract_variants_af(
                vcf_path,
                lift_merged["chr"], lift_merged["start"], lift_merged["end"],
                group_members,
            )
            if variants:
                af_status = "ok"
                reason = "OK"
            else:
                af_status = "no_variants"
                reason = "NO_VARIANTS"
        except Exception as ex:
            af_status = "error"
            reason = "VCF_FAIL"
            print(f"  VCF error {og_id}/{cluster_cid}/{trait}: {ex}", file=sys.stderr)
    return {
        "schemaVersion": 2,
        "ogId": og_id,
        "clusterId": cluster_cid,
        "trait": trait,
        "orthofinderVersion": orthofinder_version,
        "groupingVersion": grouping_version,
        "groupLabels": list(group_members.keys()),
        "variants": variants,
        "status": {"af": af_status, "reasonCode": reason},
    }


def _compute_liftover(
    anchor_cultivar: str, cluster: dict, flank: int, hal_path: str, hal_bin: str,
) -> tuple[dict | None, tuple[int, int]]:
    region_start = max(0, cluster["start"] - flank)
    region_end = cluster["end"] + flank
    if region_end - region_start > MAX_REGION_LENGTH:
        region_end = region_start + MAX_REGION_LENGTH
    lifted = hal_liftover(
        hal_path, anchor_cultivar, REF_GENOME,
        cluster["chr"], region_start, region_end, hal_bin,
    )
    return merge_intervals(lifted), (region_start, region_end)


def _extract_graph_body(
    anchor_cultivar: str, cluster: dict, region_start: int, region_end: int,
    all_paths: dict, hal_path: str, hal_bin: str, gbz_path: str, vg_bin: str,
):
    """Returns (graph_dict_or_None, reason_code)."""
    anchor_pick = pick_path(all_paths, anchor_cultivar, cluster["chr"], region_start)
    if not anchor_pick:
        return None, "LIFT_FAIL"
    anchor_path_name, anchor_block_start = anchor_pick
    anchor_local_start = max(0, region_start - anchor_block_start)
    anchor_local_end = region_end - anchor_block_start
    cohort = collect_cohort_paths_via_liftover(
        all_paths, hal_path, hal_bin,
        anchor_cultivar, cluster["chr"],
        region_start, region_end,
    )
    if anchor_local_start >= anchor_local_end or not cohort:
        return None, "NO_COHORT"
    graph = extract_subgraph(
        gbz_path, anchor_path_name,
        anchor_local_start, anchor_local_end,
        cohort, vg_bin,
    )
    if graph and graph.get("nodes"):
        return graph, "OK"
    return graph, "VG_CHUNK_EMPTY"


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
    """Legacy v1 API — retained for backward compat during migration only.
    Combines graph + AF into one JSON. New code should call
    extract_cluster_graph() + extract_cluster_af() separately.
    """
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


def _sha256_file(path: str) -> str:
    import hashlib as _hl
    h = _hl.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _sha256_tree(dir_path: str) -> str:
    """Stable content hash over a directory's sorted (relpath, sha256) list."""
    import hashlib as _hl
    acc = _hl.sha256()
    for dirpath, dirnames, filenames in os.walk(dir_path):
        dirnames.sort()
        for fn in sorted(filenames):
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, dir_path)
            acc.update(rel.encode())
            acc.update(b"\0")
            acc.update(_sha256_file(full).encode())
            acc.update(b"\0")
    return acc.hexdigest()


def _git_short_sha() -> str:
    try:
        out = subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            stderr=subprocess.DEVNULL,
        )
        return out.decode().strip()
    except Exception:
        return "unknown"


def main():
    ap = argparse.ArgumentParser()
    # v2 schema — trait-split + version-namespaced. The old --candidates +
    # --trait single-trait flow is retired; use --og-list + all-traits
    # groupings instead.
    ap.add_argument("--og-list", required=True,
                    help="One OG id per line. Output of prepare-og-region-inputs.py.")
    ap.add_argument("--hal", required=True)
    ap.add_argument("--gbz", required=True)
    ap.add_argument("--vcf", required=True)
    ap.add_argument("--gene-coords-dir", required=True,
                    help="Local dir mirroring Storage og_gene_coords/ chunks.")
    ap.add_argument("--groupings", required=True,
                    help="JSON: {trait: {groupLabels: [...], groupMembers: {label: [cultivar,...]}}}")
    ap.add_argument("--of", type=int, required=True, dest="orthofinder_version")
    ap.add_argument("--g", type=int, required=True, dest="grouping_version")
    ap.add_argument("--output", required=True,
                    help="Local staging root. Will write "
                         "og_region_graph/<runId>/... and og_region_af/<runId>/...")
    ap.add_argument("--flank", type=int, default=10_000)
    ap.add_argument("--cluster-threshold", type=int, default=25_000)
    ap.add_argument("--cluster-cap", type=int, default=5)
    ap.add_argument("--hal-bin-dir", default=os.path.expanduser("~/cactus-bin/bin"))
    args = ap.parse_args()

    os.makedirs(args.output, exist_ok=True)
    hal_bin = os.path.join(args.hal_bin_dir, "halLiftover")
    vg_bin = os.path.join(args.hal_bin_dir, "vg")

    of = args.orthofinder_version
    g = args.grouping_version
    run_id = f"v{of}_g{g}_{time.strftime('%Y%m%dT%H%M%SZ', time.gmtime())}"
    graph_root = os.path.join(args.output, "og_region_graph", run_id)
    af_root = os.path.join(args.output, "og_region_af", run_id)
    os.makedirs(graph_root, exist_ok=True)
    os.makedirs(af_root, exist_ok=True)

    # ── Fingerprints (bound into every manifest) ──────────────
    print("Hashing inputs…", flush=True)
    hal_sha = _sha256_file(args.hal)
    gbz_sha = _sha256_file(args.gbz)
    vcf_sha = _sha256_file(args.vcf)
    coords_hash = _sha256_tree(args.gene_coords_dir)
    candidates_sha = _sha256_file(args.og_list)
    extractor_sha = _git_short_sha()
    generated_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    print("Loading GBZ path metadata…", flush=True)
    all_paths = load_all_paths(args.gbz, vg_bin)

    print("Loading coordinate index…", flush=True)
    og_coords: dict = {}
    for f in sorted(os.listdir(args.gene_coords_dir)):
        if f.endswith(".json"):
            with open(os.path.join(args.gene_coords_dir, f)) as fh:
                og_coords.update(json.load(fh))
    print(f"  {len(og_coords)} OGs with coords", flush=True)

    with open(args.groupings) as fh:
        all_groupings = json.load(fh)
    usable_traits = sorted(all_groupings.keys())
    print(f"Usable traits: {len(usable_traits)}  {usable_traits}", flush=True)

    with open(args.og_list) as fh:
        candidate_ogs = [ln.strip() for ln in fh if ln.strip()]
    print(f"Candidate OGs: {len(candidate_ogs)}", flush=True)

    # ── Per-trait AF manifest scaffolding ─────────────────────
    af_manifests: dict[str, dict] = {}
    for t in usable_traits:
        trait_groupings = all_groupings[t]
        os.makedirs(os.path.join(af_root, t), exist_ok=True)
        af_manifests[t] = {
            "schemaVersion": 2,
            "orthofinderVersion": of,
            "groupingVersion": g,
            "trait": t,
            "usable": True,
            "groupLabels": list(trait_groupings["groupLabels"]),
            "generatedAt": generated_at,
            "extractorGitSha": extractor_sha,
            "inputFingerprints": {
                "vcf": {"path": args.vcf, "sha256": vcf_sha},
                "groupingsDocVersion": g,
            },
            "totals": {
                "ogsEmitted": 0,
                "clustersEmitted": 0,
                "statusCounts": {"af_ok": 0, "af_no_variants": 0,
                                 "af_unmapped": 0, "af_error": 0},
            },
            "ogs": {},
        }

    # ── Graph manifest scaffolding ────────────────────────────
    graph_manifest: dict = {
        "schemaVersion": 2,
        "orthofinderVersion": of,
        "groupingVersion": g,
        "generatedAt": generated_at,
        "extractorGitSha": extractor_sha,
        "inputFingerprints": {
            "hal":            {"path": args.hal, "sha256": hal_sha},
            "gbz":            {"path": args.gbz, "sha256": gbz_sha},
            "geneCoordsDir":  {"path": args.gene_coords_dir, "contentHash": coords_hash},
            "candidateListSha256": candidates_sha,
        },
        "clusterCap": args.cluster_cap,
        "flankBp": args.flank,
        "clusterThresholdBp": args.cluster_threshold,
        "anchorPriority": list(ANCHOR_PRIORITY),
        "totals": {
            "candidateOgs": len(candidate_ogs),
            "ogsEmitted": 0,
            "ogsSkipped": 0,
            "clustersEmitted": 0,
            "statusCounts": {"graph_ok": 0, "graph_empty": 0, "graph_error": 0},
            "skipReasonCounts": {},
        },
        "ogs": {},
    }

    def _record_skip(og_id: str, reason: str):
        graph_manifest["ogs"][og_id] = {
            "status": "skipped", "skipReason": reason, "clusters": [],
        }
        graph_manifest["totals"]["ogsSkipped"] += 1
        graph_manifest["totals"]["skipReasonCounts"][reason] = (
            graph_manifest["totals"]["skipReasonCounts"].get(reason, 0) + 1
        )

    # ── Per-OG extraction loop ────────────────────────────────
    start_time = time.time()
    for i, og_id in enumerate(candidate_ogs):
        cultivars_data = og_coords.get(og_id, {})
        if not cultivars_data:
            _record_skip(og_id, "NO_GENE_COORDS")
            continue

        anchor = pick_anchor_cultivar(cultivars_data)
        if not anchor:
            _record_skip(og_id, "NO_ANCHOR_CULTIVAR")
            continue

        clusters = cluster_genes(cultivars_data[anchor], args.cluster_threshold)
        if not clusters:
            _record_skip(og_id, "NO_CLUSTERS")
            continue

        clusters.sort(key=lambda c: -len(c["genes"]))
        truncated = len(clusters) > args.cluster_cap
        clusters = clusters[: args.cluster_cap]

        og_graph_dir = os.path.join(graph_root, og_id)
        os.makedirs(og_graph_dir, exist_ok=True)

        kind_for_og = "dispersed" if len(clusters) > 1 else None
        cluster_entries: list[dict] = []

        for cluster in clusters:
            kind = kind_for_og if kind_for_og else (
                "tandem" if len(cluster["genes"]) > 1 else "singleton"
            )
            try:
                graph_data, lift_merged = extract_cluster_graph(
                    og_id, anchor, cluster, kind, all_paths,
                    args.hal, args.gbz, args.flank, hal_bin, vg_bin, of,
                )
            except Exception as ex:
                _record_skip(og_id, "EXTRACTOR_ERROR")
                print(f"  ERROR {og_id}: {ex}", file=sys.stderr)
                break  # skip remaining clusters of this OG

            cid = graph_data["clusterId"]
            # Write graph JSON
            with open(os.path.join(og_graph_dir, f"{cid}.json"), "w") as fh:
                json.dump(graph_data, fh, separators=(",", ":"))

            graph_manifest["totals"]["clustersEmitted"] += 1
            gs = graph_data["status"]["graph"]
            graph_manifest["totals"]["statusCounts"][f"graph_{gs}"] += 1

            cluster_entries.append({
                "clusterId": cid,
                "chr": cluster["chr"],
                "start": cluster["start"],
                "end": cluster["end"],
                "geneCount": len(cluster["genes"]),
                "kind": kind,
                "graphStatus": gs,
            })

            # Per-trait AF
            for t in usable_traits:
                gm = all_groupings[t]["groupMembers"]
                af_data = extract_cluster_af(
                    og_id, cid, t, gm, lift_merged, args.vcf, of, g,
                )
                af_og_dir = os.path.join(af_root, t, og_id)
                os.makedirs(af_og_dir, exist_ok=True)
                with open(os.path.join(af_og_dir, f"{cid}.json"), "w") as fh:
                    json.dump(af_data, fh, separators=(",", ":"))

                m = af_manifests[t]
                m["totals"]["clustersEmitted"] += 1
                m["totals"]["statusCounts"][f"af_{af_data['status']['af']}"] += 1
                og_entry = m["ogs"].setdefault(og_id, {"clusters": []})
                og_entry["clusters"].append({
                    "clusterId": cid,
                    "afStatus": af_data["status"]["af"],
                    "variantCount": len(af_data["variants"]),
                })

        if og_id not in graph_manifest["ogs"]:
            # Record emitted OG
            graph_manifest["ogs"][og_id] = {
                "status": "emitted",
                "anchorCultivar": anchor,
                "truncated": truncated,
                "clusters": cluster_entries,
            }
            graph_manifest["totals"]["ogsEmitted"] += 1
            for t in usable_traits:
                af_manifests[t]["totals"]["ogsEmitted"] += 1

        if (i + 1) % 25 == 0:
            elapsed = time.time() - start_time
            t = graph_manifest["totals"]
            print(
                f"  {i+1}/{len(candidate_ogs)} OGs · "
                f"emit={t['ogsEmitted']} skip={t['ogsSkipped']} "
                f"clusters={t['clustersEmitted']} · "
                f"{elapsed:.1f}s elapsed",
                flush=True,
            )

    # ── Write manifests ───────────────────────────────────────
    with open(os.path.join(graph_root, "_manifest.json"), "w") as fh:
        json.dump(graph_manifest, fh, indent=2)
    for t in usable_traits:
        with open(os.path.join(af_root, t, "_manifest.json"), "w") as fh:
            json.dump(af_manifests[t], fh, indent=2)

    # Cross-trait AF summary
    summary_manifest = {
        "schemaVersion": 2,
        "orthofinderVersion": of,
        "groupingVersion": g,
        "generatedAt": generated_at,
        "traits": {
            t: {
                "usable": True,
                "ogsEmitted": af_manifests[t]["totals"]["ogsEmitted"],
                "clustersEmitted": af_manifests[t]["totals"]["clustersEmitted"],
            } for t in usable_traits
        },
    }
    with open(os.path.join(af_root, "_manifest.json"), "w") as fh:
        json.dump(summary_manifest, fh, indent=2)

    elapsed = round(time.time() - start_time, 1)
    t = graph_manifest["totals"]
    print(f"\n=== Batch complete ({elapsed}s) ===")
    print(f"candidate OGs: {t['candidateOgs']}")
    print(f"emitted:       {t['ogsEmitted']}")
    print(f"skipped:       {t['ogsSkipped']}  {dict(t['skipReasonCounts'])}")
    print(f"clusters:      {t['clustersEmitted']}  {t['statusCounts']}")
    print(f"Graph manifest: {graph_root}/_manifest.json")
    print(f"AF summary:     {af_root}/_manifest.json")
    print(f"runId:          {run_id}")


if __name__ == "__main__":
    main()

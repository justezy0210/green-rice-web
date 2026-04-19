#!/usr/bin/env python3
"""
Pre-compute per-OG allele frequency by group.

Usage:
  python scripts/compute-allele-freq.py

Reads:
  - data/irgsp-1.0.gff              (gene coordinates)
  - data/green-rice-pg.vcf.gz       (variants)
  - Firebase: og_descriptions.json   (OG → IRGSP transcripts)
  - Firebase: groupings/{traitId}    (group assignments)
  - Firebase: orthogroup_diffs/{traitId} (candidate OG list)

Writes:
  - Firebase Storage: og_allele_freq/v{orthofinderVersion}/g{groupingVersion}/{traitId}.json
"""

import gzip
import json
import os
import re
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote

import firebase_admin
from firebase_admin import credentials, firestore, storage

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _storage_paths import og_allele_freq_path, orthofinder_og_descriptions_path

# ─────────────────────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
GFF_PATH = DATA_DIR / "irgsp-1.0.gff"
VCF_PATH = DATA_DIR / "green-rice-pg.vcf.gz"
SA_PATH = PROJECT_ROOT / "service-account.json"

MAX_VARIANTS_PER_OG = 50   # top by delta_AF
MIN_DELTA_AF = 0.0          # include all, sort by delta

# ─────────────────────────────────────────────────────────────
# Step 1: Parse IRGSP GFF → gene coordinate index
# ─────────────────────────────────────────────────────────────

def parse_irgsp_gff(path: Path) -> dict[str, dict]:
    """Returns {geneId: {chr, start, end, strand}}"""
    genes = {}
    with open(path) as f:
        for line in f:
            if line.startswith("#"):
                continue
            cols = line.split("\t")
            if len(cols) < 9 or cols[2] != "gene":
                continue
            attrs = {}
            for pair in cols[8].split(";"):
                if "=" in pair:
                    k, v = pair.split("=", 1)
                    attrs[k.strip()] = unquote(v.strip())
            gene_id = attrs.get("ID", "")
            if not gene_id:
                continue
            genes[gene_id] = {
                "chr": cols[0],
                "start": int(cols[3]),
                "end": int(cols[4]),
                "strand": cols[6],
            }
    return genes


# ─────────────────────────────────────────────────────────────
# Step 2: Map OG → IRGSP gene regions
# ─────────────────────────────────────────────────────────────

TRANSCRIPT_TO_GENE_RE = re.compile(r"^(Os\d{2})t(\d+-\d+)$")


def transcript_to_gene_id(tid: str) -> str | None:
    """Os01t0100100-01 → Os01g0100100"""
    m = TRANSCRIPT_TO_GENE_RE.match(tid)
    if not m:
        return None
    return f"{m.group(1)}g{m.group(2).split('-')[0]}"


def build_og_gene_regions(
    og_descriptions: dict, gene_index: dict
) -> dict[str, list[dict]]:
    """Returns {ogId: [{geneId, chr, start, end}]}"""
    og_regions: dict[str, list[dict]] = {}
    for og_id, info in og_descriptions.items():
        transcripts = info.get("transcripts", [])
        regions = []
        seen_genes = set()
        for tid in transcripts:
            gene_id = transcript_to_gene_id(tid)
            if not gene_id or gene_id in seen_genes:
                continue
            seen_genes.add(gene_id)
            gene = gene_index.get(gene_id)
            if gene:
                regions.append({
                    "geneId": gene_id,
                    "chr": gene["chr"],
                    "start": gene["start"],
                    "end": gene["end"],
                })
        if regions:
            og_regions[og_id] = regions
    return og_regions


# ─────────────────────────────────────────────────────────────
# Step 3: Build region interval index for fast VCF lookup
# ─────────────────────────────────────────────────────────────

def build_region_index(
    og_regions: dict[str, list[dict]],
) -> dict[str, list[tuple[int, int, str]]]:
    """Returns {chr: [(start, end, ogId), ...]} sorted by start."""
    by_chr: dict[str, list[tuple[int, int, str]]] = defaultdict(list)
    for og_id, regions in og_regions.items():
        for r in regions:
            by_chr[r["chr"]].append((r["start"], r["end"], og_id))
    for chrom in by_chr:
        by_chr[chrom].sort()
    return by_chr


# ─────────────────────────────────────────────────────────────
# Step 4: Stream VCF + extract variants per OG
# ─────────────────────────────────────────────────────────────

def parse_gt(gt_str: str) -> tuple[int, int]:
    """Parse GT field → (ref_count, alt_count). Handles 0/0, 0/1, 1/1, ./."""
    alleles = re.split(r"[/|]", gt_str)
    ref_count = 0
    alt_count = 0
    for a in alleles:
        if a == "." or a == "":
            continue
        if a == "0":
            ref_count += 1
        else:
            alt_count += 1
    return ref_count, alt_count


def stream_vcf_variants(
    vcf_path: Path,
    region_index: dict[str, list[tuple[int, int, str]]],
    sample_names: list[str] | None = None,
) -> tuple[list[str], dict[str, list[dict]]]:
    """
    Stream VCF and collect variants per OG.
    Returns (sample_ids, {ogId: [variant_dicts]}).
    """
    og_variants: dict[str, list[dict]] = defaultdict(list)
    samples = []

    # Pointer per chromosome for region scanning
    chr_ptrs: dict[str, int] = defaultdict(int)

    with gzip.open(vcf_path, "rt") as f:
        for line in f:
            if line.startswith("##"):
                continue
            if line.startswith("#CHROM"):
                cols = line.strip().split("\t")
                samples = cols[9:]
                continue

            cols = line.strip().split("\t")
            if len(cols) < 10:
                continue

            chrom = cols[0]
            pos = int(cols[1])
            ref = cols[3]
            alt = cols[4]

            regions = region_index.get(chrom)
            if not regions:
                continue

            # Advance pointer past regions that end before this position
            ptr = chr_ptrs[chrom]
            while ptr < len(regions) and regions[ptr][1] < pos:
                ptr += 1
            chr_ptrs[chrom] = ptr

            # Check all regions that could contain this position
            for i in range(ptr, len(regions)):
                r_start, r_end, og_id = regions[i]
                if r_start > pos:
                    break  # all remaining regions start after pos
                if r_start <= pos <= r_end:
                    # Extract genotypes
                    gts = {}
                    for j, gt_field in enumerate(cols[9:]):
                        gt = gt_field.split(":")[0]  # GT is first FORMAT field
                        gts[samples[j]] = gt
                    og_variants[og_id].append({
                        "chr": chrom,
                        "pos": pos,
                        "ref": ref,
                        "alt": alt,
                        "gts": gts,
                    })

    return samples, dict(og_variants)


# ─────────────────────────────────────────────────────────────
# Step 5: Compute group-level AF
# ─────────────────────────────────────────────────────────────

def compute_group_af(
    variants: list[dict],
    group_members: dict[str, list[str]],  # groupLabel → [sampleIds]
) -> list[dict]:
    """Compute AF per group for each variant. Returns sorted by delta_AF desc."""
    results = []
    for v in variants:
        af_by_group: dict[str, float] = {}
        counts_by_group: dict[str, dict[str, int]] = {}
        for group_label, members in group_members.items():
            total_alleles = 0
            alt_alleles = 0
            for sample in members:
                gt = v["gts"].get(sample)
                if not gt or gt == "./.":
                    continue
                ref_c, alt_c = parse_gt(gt)
                total_alleles += ref_c + alt_c
                alt_alleles += alt_c
            ref_alleles = total_alleles - alt_alleles
            af_by_group[group_label] = (
                alt_alleles / total_alleles if total_alleles > 0 else 0.0
            )
            counts_by_group[group_label] = {
                "ref": ref_alleles,
                "alt": alt_alleles,
                "total": total_alleles,
            }

        afs = list(af_by_group.values())
        delta_af = max(afs) - min(afs) if len(afs) >= 2 else 0.0

        results.append({
            "chr": v["chr"],
            "pos": v["pos"],
            "ref": v["ref"],
            "alt": v["alt"],
            "afByGroup": {k: round(v, 4) for k, v in af_by_group.items()},
            "countsByGroup": counts_by_group,
            "deltaAf": round(delta_af, 4),
        })

    results.sort(key=lambda x: -x["deltaAf"])
    return results


# ─────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────

def main():
    print("=== Allele Frequency Pre-computation ===")

    # Firebase init
    cred = credentials.Certificate(str(SA_PATH))
    firebase_admin.initialize_app(cred, {"storageBucket": "green-rice-db.firebasestorage.app"})
    db = firestore.client()
    bucket = storage.bucket()

    # Step 1: Gene index
    print("Step 1: Parsing IRGSP GFF...")
    gene_index = parse_irgsp_gff(GFF_PATH)
    print(f"  {len(gene_index)} genes indexed")

    # Load og_descriptions from Storage
    print("Step 2: Loading OG descriptions + building gene regions...")
    state_doc = db.collection("_orthofinder_meta").document("state").get()
    active_version = state_doc.to_dict().get("activeVersion", 0) if state_doc.exists else 0
    if active_version == 0:
        print("  ERROR: No active orthofinder version")
        sys.exit(1)

    desc_blob = bucket.blob(orthofinder_og_descriptions_path(active_version))
    og_descriptions = json.loads(desc_blob.download_as_text())
    og_regions = build_og_gene_regions(og_descriptions, gene_index)
    print(f"  {len(og_regions)} OGs have IRGSP gene regions")

    # Build region index
    region_index = build_region_index(og_regions)
    total_regions = sum(len(v) for v in region_index.values())
    print(f"  {total_regions} gene regions across {len(region_index)} chromosomes")

    # Step 3: Stream VCF
    print("Step 3: Streaming VCF (this may take a minute)...")
    vcf_samples, og_variants = stream_vcf_variants(VCF_PATH, region_index)
    print(f"  VCF samples: {vcf_samples}")
    total_variants = sum(len(v) for v in og_variants.values())
    print(f"  {total_variants} variants across {len(og_variants)} OGs")

    # Step 4-5: Per-trait computation
    print("Step 4-5: Computing per-trait allele frequencies...")

    # Load grouping version
    lock_doc = db.collection("_grouping_meta").document("lock").get()
    grouping_version = lock_doc.to_dict().get("version", 0) if lock_doc.exists else 0

    grouping_docs = db.collection("groupings").stream()
    computed_at = datetime.now(timezone.utc).isoformat()

    for gd in grouping_docs:
        trait_id = gd.id
        data = gd.to_dict() or {}
        summary = data.get("summary", {}) or {}
        assignments = data.get("assignments", {}) or {}

        if summary.get("method") == "none":
            continue

        # Build group members (sample IDs present in VCF)
        group_members: dict[str, list[str]] = {}
        for cid, a in assignments.items():
            if a.get("borderline"):
                continue
            lbl = a.get("groupLabel")
            if not lbl:
                continue
            if cid not in vcf_samples:
                continue
            group_members.setdefault(lbl, []).append(cid)

        if len(group_members) < 2:
            print(f"  {trait_id}: skipped (< 2 groups with VCF samples)")
            continue

        # Load candidate OGs for this trait
        diff_doc = db.collection("orthogroup_diffs").document(trait_id).get()
        if not diff_doc.exists:
            print(f"  {trait_id}: skipped (no diff doc)")
            continue
        diff_data = diff_doc.to_dict() or {}
        storage_path = diff_data.get("storagePath")
        if not storage_path:
            print(f"  {trait_id}: skipped (no storagePath)")
            continue

        # Load candidate OG list from Storage payload
        payload_blob = bucket.blob(storage_path)
        payload = json.loads(payload_blob.download_as_text())
        candidate_ogs = [e["orthogroup"] for e in payload.get("entries", [])]

        # Compute AF for each candidate OG
        ogs_result: dict[str, dict] = {}
        og_with_variants = 0
        for og_id in candidate_ogs:
            if og_id not in og_variants:
                continue
            variants = og_variants[og_id]
            if not variants:
                continue

            af_results = compute_group_af(variants, group_members)
            top_variants = af_results[:MAX_VARIANTS_PER_OG]

            regions = og_regions.get(og_id, [])
            ogs_result[og_id] = {
                "geneRegions": [
                    {"geneId": r["geneId"], "chr": r["chr"], "start": r["start"], "end": r["end"]}
                    for r in regions
                ],
                "totalVariants": len(variants),
                "variants": top_variants,
            }
            og_with_variants += 1

        output = {
            "schemaVersion": 1,
            "traitId": trait_id,
            "orthofinderVersion": active_version,
            "groupingVersion": grouping_version,
            "computedAt": computed_at,
            "groupLabels": sorted(group_members.keys()),
            "samplesByGroup": {k: sorted(v) for k, v in group_members.items()},
            "ogs": ogs_result,
        }

        # Upload to Storage
        out_path = og_allele_freq_path(active_version, grouping_version, trait_id)
        out_json = json.dumps(output)
        bucket.blob(out_path).upload_from_string(out_json, content_type="application/json")
        size_kb = len(out_json) / 1024
        print(f"  {trait_id}: {og_with_variants} OGs with variants, {size_kb:.1f} KB → {out_path}")

    print("=== Done ===")


if __name__ == "__main__":
    main()

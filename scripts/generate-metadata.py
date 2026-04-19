#!/usr/bin/env python3
"""
Generate metadata artifacts: samples.json, analysis_manifest.json, qc_summary.json.
Upload to Firebase Storage.
"""

import json
import gzip
from datetime import datetime, timezone
from pathlib import Path

import firebase_admin
from firebase_admin import credentials, firestore, storage

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SA_PATH = PROJECT_ROOT / "service-account.json"
VCF_PATH = PROJECT_ROOT / "data" / "green-rice-pg.vcf.gz"

ALL_CULTIVARS = [
    "baegilmi", "chamdongjin", "chindeul", "dasan",
    "dongjin", "hwaseong", "hyeonpum", "ilmi",
    "jopyeong", "jungmo1024", "namchan", "namil",
    "odae", "pyeongwon", "saeilmi", "samgwang",
]


def get_vcf_samples() -> list[str]:
    with gzip.open(VCF_PATH, "rt") as f:
        for line in f:
            if line.startswith("#CHROM"):
                return line.strip().split("\t")[9:]
    return []


def main():
    cred = credentials.Certificate(str(SA_PATH))
    firebase_admin.initialize_app(cred, {"storageBucket": "green-rice-db.firebasestorage.app"})
    db = firestore.client()
    bucket = storage.bucket()

    vcf_samples = get_vcf_samples()
    print(f"VCF samples: {vcf_samples}")

    # Get orthofinder state
    state_doc = db.collection("_orthofinder_meta").document("state").get()
    state = state_doc.to_dict() if state_doc.exists else {}
    active_version = state.get("activeVersion", 0)

    # Get grouping version
    lock_doc = db.collection("_grouping_meta").document("lock").get()
    lock = lock_doc.to_dict() if lock_doc.exists else {}
    grouping_version = lock.get("version", 0)

    # Get cultivar docs from Firestore
    cultivar_docs = db.collection("cultivars").stream()
    cultivar_map = {}
    for cd in cultivar_docs:
        d = cd.to_dict() or {}
        cultivar_map[cd.id] = d

    now = datetime.now(timezone.utc).isoformat()

    # ─── samples.json ───
    samples = []
    for cid in sorted(set(ALL_CULTIVARS + list(cultivar_map.keys()))):
        entry = {
            "id": cid,
            "name": cultivar_map.get(cid, {}).get("name", cid),
            "role": "cultivar",
            "inVcf": cid in vcf_samples,
            "inOrthoFinder": cid in state.get("cultivarIds", []),
            "hasGenomeUploaded": bool(cultivar_map.get(cid, {}).get("genomeSummary")),
            "hasPhenotype": cid in cultivar_map,
        }
        samples.append(entry)

    # Add IRGSP reference
    samples.append({
        "id": "IRGSP-1.0",
        "name": "IRGSP-1.0 (Nipponbare)",
        "role": "reference",
        "inVcf": False,
        "inOrthoFinder": "IRGSP-1.0" in state.get("cultivarIds", []),
        "hasGenomeUploaded": False,
        "hasPhenotype": False,
    })

    samples_json = {"generatedAt": now, "samples": samples}
    upload(bucket, "metadata/samples.json", samples_json)

    # ─── analysis_manifest.json ───
    manifest = {
        "generatedAt": now,
        "orthofinderVersion": active_version,
        "groupingVersion": grouping_version,
        "pipelines": {
            "orthofinder": {
                "tool": "OrthoFinder",
                "inputFiles": ["Orthogroups.GeneCount.tsv", "Orthogroups_with_description.tsv"],
                "automation": "Cloud Function (start_orthofinder_processing)",
            },
            "autoGrouping": {
                "tool": "GMM (sklearn GaussianMixture)",
                "trigger": "on_cultivar_change Cloud Function",
                "automation": "automatic",
            },
            "differentialAnalysis": {
                "tool": "Mann-Whitney U (scipy, asymptotic) + BH FDR",
                "selectionPolicy": "exploratory — raw p < 0.05 + |Δmean| ≥ 0.5",
                "effectSize": "Cliff's delta (derived from U statistic)",
                "note": "n=11 cultivars — too small for BH significance. Results are exploratory candidates, not statistically confirmed hits.",
                "automation": "automatic (runs after grouping)",
            },
            "geneRegionVariants": {
                "tool": "Custom Python script (compute-allele-freq.py)",
                "input": "Cactus pangenome VCF + IRGSP-1.0 GFF",
                "vcfSamples": vcf_samples,
                "vcfSampleCount": len(vcf_samples),
                "totalCultivars": len(ALL_CULTIVARS),
                "missingSamples": [c for c in ALL_CULTIVARS if c not in vcf_samples],
                "note": "AF computed from gene-region variants only (IRGSP gene boundary). Not whole-OG allele spectrum.",
                "automation": "manual (local script)",
            },
            "functionalCategories": {
                "tool": "GPT-5.4 via Codex CLI (batch classification)",
                "categories": 17,
                "note": "LLM-derived convenience classification. Not formal GO/InterPro annotation. Non-deterministic — results may vary on re-run.",
                "automation": "manual (local script)",
            },
        },
        "knownLimitations": [
            "Candidate OGs without IRGSP annotation have no reference-anchored gene-region variants or pangenome graph coverage; cluster-derived views are the only fallback",
            "VCF contains 11 of 16 cultivars — 5 missing from pangenome alignment",
            "Copy count is OrthoFinder gene model count, subject to annotation fragmentation",
            "MWU raw p-value selection is exploratory, not FDR-significant",
            "LLM classification is non-reproducible and not formally validated",
        ],
    }
    upload(bucket, "metadata/analysis_manifest.json", manifest)

    # ─── qc_summary.json ───
    # Load matrix to get per-cultivar stats
    try:
        matrix_blob = bucket.blob(f"orthofinder/v{active_version}/_matrix.json")
        matrix = json.loads(matrix_blob.download_as_text())
        cultivar_ids = matrix.get("cultivarIds", [])
        ogs = matrix.get("ogs", {})
        total_ogs = len(ogs)

        per_cultivar_gene_count = {}
        for cid in cultivar_ids:
            total = sum(og_data.get(cid, 0) for og_data in ogs.values())
            per_cultivar_gene_count[cid] = total

        # OGs with no copies in any cultivar
        empty_ogs = sum(1 for og_data in ogs.values() if all(v == 0 for v in og_data.values()))

        # OGs with IRGSP annotation
        try:
            desc_blob = bucket.blob(f"orthofinder/v{active_version}/og_descriptions.json")
            descs = json.loads(desc_blob.download_as_text())
            ogs_with_desc = len(descs)
        except Exception:
            ogs_with_desc = 0

        # Categories coverage
        try:
            cat_blob = bucket.blob(f"orthofinder/v{active_version}/og_categories.json")
            cats = json.loads(cat_blob.download_as_text())
            ogs_classified = cats.get("totalClassified", 0)
        except Exception:
            ogs_classified = 0

    except Exception as e:
        print(f"  Warning: could not load matrix: {e}")
        total_ogs = 0
        per_cultivar_gene_count = {}
        empty_ogs = 0
        ogs_with_desc = 0
        ogs_classified = 0

    qc = {
        "generatedAt": now,
        "orthofinderVersion": active_version,
        "totalOrthogroups": total_ogs,
        "emptyOrthogroups": empty_ogs,
        "ogsWithIrgspDescription": ogs_with_desc,
        "ogsWithIrgspDescriptionPct": round(ogs_with_desc / total_ogs * 100, 1) if total_ogs > 0 else 0,
        "ogsClassified": ogs_classified,
        "perCultivarGeneCount": per_cultivar_gene_count,
        "vcfCoverage": {
            "samplesInVcf": len(vcf_samples),
            "totalCultivars": len(ALL_CULTIVARS),
            "missingSamples": [c for c in ALL_CULTIVARS if c not in vcf_samples],
        },
    }
    upload(bucket, "metadata/qc_summary.json", qc)

    print("=== Done ===")


def upload(bucket, path: str, data: dict):
    blob = bucket.blob(path)
    blob.upload_from_string(json.dumps(data, indent=2), content_type="application/json")
    print(f"  Uploaded {path} ({len(json.dumps(data)) / 1024:.1f} KB)")


if __name__ == "__main__":
    main()

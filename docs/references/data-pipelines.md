# Data Pipelines — Master Reference

All pipelines that produce artifacts for the web database.

## Pipeline Overview

```
┌──────────────────────────────────────────────────────────┐
│  AUTOMATIC (Cloud Functions)                              │
│                                                          │
│  1. Cultivar change → Auto-grouping (GMM)                │
│  2. OrthoFinder TSV upload → matrix + chunks + diffs     │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  MANUAL (local scripts — run after data changes)          │
│                                                          │
│  3. compute-allele-freq.py     → gene-region variants    │
│  4. classify-og-descriptions.sh → LLM categories         │
│  5. generate-metadata.py       → samples/manifest/qc     │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  MANUAL (server scripts — requires HAL + GBZ + VCF)       │
│                                                          │
│  6. batch-region-extract.py    → per-cluster og_region   │
│                                   (graph + AF)           │
└──────────────────────────────────────────────────────────┘
```

## Dependency Graph

```
OrthoFinder TSV upload
  ├─→ [auto] matrix + chunks + descriptions + annotation
  ├─→ [auto] orthogroup diffs (per trait)
  ├─→ [manual] LLM categories (scripts/classify-og-descriptions.sh)
  ├─→ [manual] gene-region variants (scripts/compute-allele-freq.py)
  └─→ [manual] per-cluster region (scripts/batch-region-extract.py)

Cultivar add/edit/delete
  ├─→ [auto] grouping (GMM)
  ├─→ [auto] orthogroup diffs (recompute)
  └─→ [manual] gene-region variants (recompute — group members change)

VCF change
  └─→ [manual] gene-region variants (recompute)

HAL/GBZ change
  └─→ [manual] per-cluster region (recompute)
```

## Full Re-upload Procedure

When all data is being refreshed from scratch:

```bash
# 1. Deploy Cloud Functions + Storage rules
firebase deploy --only functions:grouping,storage

# 2. Admin panel: upload OrthoFinder TSVs
#    → triggers: matrix, chunks, descriptions, annotation, diffs

# 3. LLM categories (requires og_descriptions.json from step 2)
source functions-python/venv/bin/activate
bash scripts/classify-og-descriptions.sh

# 4. Gene-region variants (requires VCF + IRGSP GFF + groupings from step 2)
python scripts/compute-allele-freq.py

# 5. Per-cluster region data (on server — requires HAL + GBZ + VCF + og_descriptions)
# See: scripts/batch-region-extract.py --help
# Transfer og_descriptions.json + IRGSP GFF + gene_coords to server first

# 6. Metadata artifacts (run last — summarizes all other artifacts)
python scripts/generate-metadata.py
```

## Server Paths (ssh -p 11019 ezy@203.255.11.226)

```
HAL:          /10Gdata/ezy/.../cactus/gr-pg/green-rice-pg.full.hal
VCF:          /10Gdata/ezy/.../cactus/gr-pg/green-rice-pg.vcf.gz
IRGSP GFF:    data/irgsp-1.0.gff (local)
Cultivar GFF: /10Gdata/ezy/.../results/{cultivar}/{cultivar}.gff3
HAL tools:    ~/cactus-bin/bin/
```

## Storage Artifacts Layout

```
orthofinder/v{N}/
  ├─ _matrix.json
  ├─ og_descriptions.json
  ├─ og_categories.json
  ├─ baegilmi_gene_annotation.json
  └─ og-members/chunk_*.json

orthogroup_diffs/v{N}/g{M}/{trait}.json

og_allele_freq/v{N}/g{M}/{trait}.json

og_tubemap/{ogId}.json                    ← per-OG default IRGSP-anchored tube map
og_region/{ogId}/{clusterId}.json          ← per-cluster region (graph + AF)
og_region/_manifest.json                   ← cluster status manifest

genomes/{cultivarId}/genome.fasta|gene.gff3|repeat.out

metadata/
  ├─ samples.json
  ├─ analysis_manifest.json
  └─ qc_summary.json
```

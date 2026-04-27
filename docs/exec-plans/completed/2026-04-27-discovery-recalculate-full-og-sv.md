# Discovery full OG x SV recalculation

Status: completed — 2026-04-27

## Goal

Recalculate Discovery evidence after removing the `(trait, OG)` top-8 SV-hit
storage cap. The database should retain the full OG x SV intersection set, while
still selecting a best SV only for candidate summary fields.

## Changes

Completed:

1. Stopped using `TOP_SV_HITS_PER_OG = 8` as the stored intersection limit.
2. Stored every qualifying OG x SV hit in `step4_intersections/{trait}.tsv`.
3. Selected `best_sv_*` for Step 5 from the full intersection set by score and
   deterministic tie-breakers.
4. Kept the global top-SV table capped separately; it remains a Step 3 summary,
   not the OG x SV evidence store.
5. Reran raw analysis on the analysis server and promoted the new artifacts.

## Server Run

Input host:

- `ssh -p 11019 ezy@203.255.11.226`

Raw output:

- `/10Gdata/ezy/02_Ongoing_Projects/00_Main/Green_Rice/results/analysis/raw_workflow_20260427/full_run`

Local mirror:

- `tmp/recalc-20260427/full_run`

## Recalculated Counts

Step 4 OG x SV intersection rows:

- `bacterial_leaf_blight`: 3,748
- `culm_length`: 6,090
- `grain_weight`: 2,520
- `heading_date`: 8,149
- `panicle_length`: 10,039
- `panicle_number`: 846
- `pre_harvest_sprouting`: 755
- `ripening_rate`: 1,912
- `spikelets_per_panicle`: 5,458

Promote result:

- Runs: 9
- Candidates: 5,196
- Blocks: 26
- Intersections: 39,517
- OGs with block backlinks: 383
- Genes with block backlinks: 423

## Validation

- `python3 -m py_compile scripts/run-raw-analysis.py scripts/promote-analysis-run.py` passed.
- Server raw analysis completed with `summary.json` and `report.md`.
- `scripts/summarize-analysis-blocks.py` and `scripts/extract-curated-blocks.py`
  regenerated block artifacts.
- `scripts/promote-analysis-run.py --dry-run` passed.
- Live promote completed with `dry_run=False`.
- Storage check: `heading_date_g4_of6_sv1_gm11_sc1` step4 artifact has 8,149
  rows and primary impact classes:
  `coding_or_splice`, `downstream_2kb`, `intron`, `promoter_2kb`,
  `upstream_2_10kb`, `utr`.
- `npm run type-check` passed.
- `npm run lint` passed.
- `npm run check:arch` passed.
- `git diff --check` passed.
- `npm run build` passed with the existing Vite chunk-size warning.
- `curl -I http://localhost:5173/discovery/locus/chr11-21-25mb-development`
  returned 200.


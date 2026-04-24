# Raw Analysis Run — 2026-04-22

Status: completed on 2026-04-22 using raw server inputs only.

Primary output directory on the analysis server:

```text
/10Gdata/ezy/02_Ongoing_Projects/00_Main/Green_Rice/results/analysis/raw_workflow_20260422/full_run
```

Supporting scripts and inputs in this repo:

- `scripts/run-raw-analysis.py`
- `data/analysis_groupings_v4.json`

This run follows the 5-step candidate-discovery workflow in
`docs/product-specs/analysis-idea.md`, but it is intentionally framed as
**candidate discovery only**. The results below must not be interpreted as
causal, validated, or marker-ready.

## Inputs

- Grouping snapshot: `data/analysis_groupings_v4.json`
  Source: `docs/generated/phenotype-groups.md`
- Orthogroup copy counts:
  `results/orthofinder/output_with_irgsp/Results_Apr15/Orthogroups/Orthogroups.GeneCount.tsv`
- Orthogroup members + IRGSP descriptions:
  `results/orthofinder/output_with_irgsp/Results_Apr15/Orthogroups/Orthogroups_with_description.tsv`
- Cultivar gene models:
  `results/funannotate_v2/primary/*_longest.gff3`
- Pangenome VCF:
  `results/cactus/gr-pg/green-rice-pg.vcf.gz`

## Policy

- Promoter window for regulatory follow-up: `2 kb`
- SV filter: top-level `LV=0` and SV-like by allele-length rule
  `|len(REF) - len(ALT0)| >= 50 bp`, plus long complex records
- Candidate ranking:
  step 2 uses raw p-value plus effect size at small `n`
  because BH-corrected q-values are uninformative at panel size 11
- Candidate wording:
  `candidate`, `proposed grouping`, `observed along with`

## Global SV Scan

- SV-like events scanned: `18,822`
- Type counts:
  - `INS`: `10,664`
  - `DEL`: `5,837`
  - `COMPLEX`: `2,321`

## Trait-Level Readout

### Heading Date

- Group balance is the strongest in the MVP panel: `early 5` vs `late 6`
- Step 2 selected `1,045` OGs from `53,539` tested
- The dominant signal is not a single isolated OG. It is a repeated block
  pattern on:
  - `chr06 9–11 Mb`
  - `chr11 24–28 Mb`
- Representative top candidates:
  - `OG0001177`
  - `OG0035336`
  - `OG0041202`
  - `OG0041302`
  - `OG0042410`
- Interpretation:
  these top hits are better read as members of a shared structural block
  rather than five independent loci.

### Culm Length

- Group balance: `short 3` vs `tall 8`
- Step 2 selected `859` OGs
- The top signal concentrates on:
  - `chr11 22–23 Mb`
  - `chr06 8–10 Mb`
- Several top OGs overlap with the heading-date signal, including:
  - `OG0040978`
  - `OG0044601`
  - `OG0044626`
- Interpretation:
  culm-length candidates appear to share a linked block with heading-date
  candidates, especially on `chr11`.

### Spikelets Per Panicle

- Group balance: `low 4` vs `high 7`
- Step 2 selected `608` OGs
- The strongest pattern is almost entirely concentrated on:
  - `chr11 21–24 Mb`
- Recurrent top OGs overlap with both heading-date and culm-length:
  - `OG0040978`
  - `OG0041302`
  - `OG0042515`
  - `OG0044601`
  - `OG0044626`
- Interpretation:
  this trait is likely reflecting the same broad haplotype block rather than
  a separate, cleanly isolated trait-specific region.

### Bacterial Leaf Blight

- Fixed-class grouping: `susceptible 4` vs `resistant 7`
- Step 2 selected `532` OGs
- The main block signal is on `chr11`, especially:
  - `chr11 27–29 Mb`
  - `chr11 18–19 Mb`
  - `chr11 25–26 Mb`
- A smaller secondary region also appears on `chr04 7–8 Mb`
- The most biologically interpretable annotated candidates in the top set are:
  - `OG0042703` — WAK-like annotation
  - `OG0001738` — NLR-like annotation
  - `OG0000297` — coiled-coil NBS-LRR / resistance-like annotation
- Interpretation:
  this trait still shows block behavior, but it has the clearest
  resistance-related functional annotations in the current run.

### Lower-Confidence Traits

These traits remain candidate-hint level only because of panel imbalance:

- `grain_weight`: heavy group `n=2`
- `ripening_rate`: low group `n=2`
- `panicle_number`: high group `n=2`, plus borderline exclusions
- `pre_harvest_sprouting`: only `7` observed cultivars
- `panicle_length`: `10:1` split

They may still contain useful candidate lists, but the present run should not
be used to argue trait architecture for them.

## Cross-Trait Reading

The main conclusion of this run is not "many independent OGs were found".
It is:

1. `heading_date`, `culm_length`, and `spikelets_per_panicle` repeatedly
   converge on shared blocks on `chr06` and `chr11`.
2. `bacterial_leaf_blight` has its own dominant `chr11` signal, with more
   defensible resistance-related annotations than the morphology/yield traits.
3. Many top-ranked OGs are likely tagging the same structural/haplotype
   background rather than acting as independent candidate mechanisms.

Repeated OGs across the top candidate sets include:

- `OG0040978`
- `OG0041302`
- `OG0042515`
- `OG0044601`
- `OG0044626`
- `OG0044635`

These are strong examples of cross-trait recurrence and should be treated as
block-associated signals first.

## Caveats

- Sample size is still `11` cultivars
- q-values are largely uninformative at this hypothesis scale and sample size
- `sv_regulatory` calls are heuristic and depend on a `2 kb` promoter policy
- No genome-wide synteny block inference was included
- No explicit inversion caller was used
- No expression or external QTL layer was integrated

## Output Inventory

Main server outputs from this run:

- `report.md`
- `summary.json`
- `step1_groupings.json`
- `step2_orthogroups/*.json|tsv`
- `step3_sv_top/*.tsv`
- `step4_intersections/*.tsv`
- `step5_candidates/*.json|tsv`

For follow-up block interpretation, see:

- [followup-block-summary-2026-04-22.md](followup-block-summary-2026-04-22.md)

The first curated block bundles were also generated server-side under:

```text
/10Gdata/ezy/02_Ongoing_Projects/00_Main/Green_Rice/results/analysis/raw_workflow_20260422/full_run/curated_blocks
```

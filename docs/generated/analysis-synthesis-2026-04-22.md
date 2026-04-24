# Analysis Synthesis — 2026-04-22

One-document summary of the full raw analysis run, written for human reading.

This document consolidates:

- the raw 5-step analysis run
- the block-level follow-up summary
- the first curated block bundles

Primary server output directory:

```text
/10Gdata/ezy/02_Ongoing_Projects/00_Main/Green_Rice/results/analysis/raw_workflow_20260422/full_run
```

Supporting documents:

- [raw-analysis-2026-04-22.md](raw-analysis-2026-04-22.md)
- [followup-block-summary-2026-04-22.md](followup-block-summary-2026-04-22.md)

## What This Run Did

This run used raw server inputs only.

- Orthogroup copy matrix from OrthoFinder
- orthogroup member and IRGSP description table
- cultivar gene models from `funannotate_v2`
- pangenome VCF from Cactus
- group definitions from the current 11-cultivar phenotype grouping snapshot

The run followed the intended 5-step workflow:

1. phenotype grouping
2. orthogroup contrast
3. SV scan
4. OG × SV intersection
5. candidate ranking

## What This Run Did Not Do

This run did **not** include:

- genome-wide synteny block inference
- a dedicated inversion caller
- expression evidence
- QTL / GWAS overlap
- validation-grade PAV / causal interpretation

This is a **candidate-discovery** run only.

## How To Read The Results

The most important reading rule is this:

many top OG hits in this run are not best interpreted as separate causal
genes. They are better interpreted as **multiple OGs tagging the same local
structural or haplotype block**.

That matters especially for:

- `heading_date`
- `culm_length`
- `spikelets_per_panicle`

So when several neighboring OGs rise together with neighboring SVs, the first
question should be:

> "Is this one block producing many linked candidates?"

not:

> "Are these ten independent candidate genes?"

## Inputs And Policy

### Input Files

- Groupings:
  `data/analysis_groupings_v4.json`
- Gene counts:
  `results/orthofinder/output_with_irgsp/Results_Apr15/Orthogroups/Orthogroups.GeneCount.tsv`
- OG members and IRGSP descriptions:
  `results/orthofinder/output_with_irgsp/Results_Apr15/Orthogroups/Orthogroups_with_description.tsv`
- Gene models:
  `results/funannotate_v2/primary/*_longest.gff3`
- Pangenome VCF:
  `results/cactus/gr-pg/green-rice-pg.vcf.gz`

### Analysis Policy

- promoter window: `2 kb`
- SV filter:
  top-level `LV=0` and SV-like by allele-length rule
- small-sample differential strategy:
  raw p-value plus effect size, because q-values are not informative at this
  panel size
- result language:
  `candidate`, `proposed grouping`, `observed along with`

## Global Summary

### SV Scan

- total SV-like events scanned: `18,822`
- type counts:
  - `INS`: `10,664`
  - `DEL`: `5,837`
  - `COMPLEX`: `2,321`

### Big Picture Conclusion

The strongest signal in the entire run is not a trait-by-trait collection of
isolated genes. It is a small set of repeated genomic blocks:

- `chr06 9–11 Mb`
- `chr11 21–25 Mb`
- `chr11 27–29 Mb`

These blocks explain most of the interpretable high-ranking hits.

## Confidence By Trait

### Highest-confidence interpretation

- `heading_date`
- `bacterial_leaf_blight`

These still remain discovery-level only, but they are the easiest to discuss
coherently from the current panel.

### Moderate-confidence interpretation

- `culm_length`
- `spikelets_per_panicle`

These have real signals, but much of the signal appears linked to shared
blocks rather than clearly trait-specific mechanisms.

### Low-confidence interpretation

- `grain_weight`
- `ripening_rate`
- `panicle_number`
- `pre_harvest_sprouting`
- `panicle_length`

Reasons:

- tiny minority group sizes
- missing observations
- borderline exclusions
- single-cultivar-like contrasts

These are useful as candidate lists, not as strong trait narratives.

## Trait-By-Trait Interpretation

## 1. Heading Date

### Group Structure

- labels: `early` vs `late`
- group counts used: `5` vs `6`
- this is the best-balanced grouping in the current 11-cultivar panel

### Output Size

- selected OGs at step 2: `1,045 / 53,539`

### Main Regions

- `chr06 9–11 Mb`
- `chr11 24–28 Mb`

### Representative Top Candidates

- `OG0001177` — `cnv_dosage` — `EV0007248` — `chr06:10559214`
- `OG0035336` — `cnv_dosage` — `EV0007256` — `chr06:10585589`
- `OG0041202` — `og_plus_sv` — `EV0007099` — `chr06:9527738`
- `OG0041302` — `og_plus_sv` — `EV0016675` — `chr11:24448424`
- `OG0042410` — `og_plus_sv` — `EV0006854` — `chr06:8272561`

### Interpretation

This is the clearest example of a block-driven signal.

The `chr06 9–11 Mb` region contains many neighboring OGs and repeated SVs such
as `EV0007248`, `EV0007287`, and `EV0007272`. Those hits should be read as
one locus neighborhood first.

The `chr11 24–25 Mb` region is the second major heading block. Several top
hits here overlap with the same regions also used by culm length and spikelets
per panicle.

### Bottom Line

`heading_date` has the strongest interpretable signal in the dataset, but the
result is still best understood as a **small number of strong blocks**, not as
one winning gene.

## 2. Bacterial Leaf Blight

### Group Structure

- labels: `susceptible` vs `resistant`
- group counts used: `4` vs `7`
- grouping is fixed-class, not inferred by GMM

### Output Size

- selected OGs at step 2: `532 / 53,539`

### Main Regions

- `chr11 27–29 Mb`
- `chr11 18–19 Mb`
- `chr11 25–26 Mb`
- secondary region: `chr04 7–8 Mb`

### Representative Top Candidates

- `OG0044685` — `og_plus_sv` — `EV0004275` — `chr04:7123800`
- `OG0047153` — `og_plus_sv` — `EV0016933` — `chr11:27366376`
- `OG0047154` — `og_plus_sv` — `EV0016939` — `chr11:27398986`
- `OG0039621` — `og_plus_sv` — `EV0015594` — `chr11:18304414`
- `OG0042703` — `og_plus_sv` — `EV0017102` — `chr11:28787830`

### Stronger Annotated Candidates

- `OG0042703` — WAK-like annotation
- `OG0001738` — NLR-like annotation
- `OG0000297` — coiled-coil NBS-LRR / resistance-like annotation

### Interpretation

This trait still shows block behavior, but unlike the developmental traits,
its top block contains more biologically plausible resistance-family
annotations.

That makes BLB the most promising trait for a near-term manual locus review.
The main interpretive unit should be the `chr11 27–29 Mb` block, with the
`chr04 7–8 Mb` block as a secondary follow-up.

### Bottom Line

`bacterial_leaf_blight` is the best place to prioritize function-aware manual
review, especially inside the `chr11 27–29 Mb` resistance-like block.

## 3. Culm Length

### Group Structure

- labels: `short` vs `tall`
- group counts used: `3` vs `8`

### Output Size

- selected OGs at step 2: `859 / 53,539`

### Main Regions

- `chr11 22–23 Mb`
- `chr06 8–10 Mb`

### Representative Top Candidates

- `OG0039795` — `og_plus_sv` — `EV0016290` — `chr11:22554918`
- `OG0049970` — `og_plus_sv` — `EV0007153` — `chr06:9776062`
- `OG0041273` — `cnv_dosage` — `EV0016292` — `chr11:22556907`
- `OG0044616` — `og_plus_sv` — `EV0016287` — `chr11:22544855`
- `OG0046679` — `og_plus_sv` — `EV0016293` — `chr11:22561185`

### Notable Annotated Candidates

- `OG0041273` — NLR-like / chilling-tolerance-like annotation
- `OG0044601` — NLR-like annotation
- `OG0039710` — UPF0005-domain annotation

### Interpretation

The dominant culm-length signal is not cleanly culm-length-only.
It overlaps strongly with heading-date and spikelets-per-panicle blocks,
especially on `chr11 22–23 Mb`.

### Bottom Line

`culm_length` has a real signal, but it should currently be treated as part of
a broader linked developmental block rather than a clearly isolated height
locus.

## 4. Spikelets Per Panicle

### Group Structure

- labels: `low` vs `high`
- group counts used: `4` vs `7`

### Output Size

- selected OGs at step 2: `608 / 53,539`

### Main Regions

- `chr11 21–24 Mb`

### Representative Top Candidates

- `OG0040978` — `og_plus_sv` — `EV0016165` — `chr11:22002188`
- `OG0041302` — `og_plus_sv` — `EV0016460` — `chr11:23438529`
- `OG0042515` — `og_plus_sv` — `EV0016421` — `chr11:23271145`
- `OG0044601` — `og_plus_sv` — `EV0016237` — `chr11:22319125`
- `OG0044626` — `og_plus_sv` — `EV0016373` — `chr11:22978834`

### Notable Annotated Candidates

- `OG0044601` — NLR-like annotation
- `OG0044626` — conserved hypothetical annotation
- `OG0044635` — barley stem rust resistance-like annotation

### Interpretation

This trait collapses most strongly into one broad block. The top 50 candidates
are concentrated almost entirely in `chr11 21–24 Mb`.

That means the current result is best used to define a **priority region**,
not to claim many separate spikelet-associated genes.

### Bottom Line

Treat `spikelets_per_panicle` as a block-first trait in this panel.

## 5. Grain Weight

### Group Structure

- labels: `light` vs `heavy`
- group counts used: `9` vs `2`

### Output Size

- selected OGs at step 2: `458 / 53,539`

### Representative Top Candidates

- `OG0002495` — `cnv_dosage` — `EV0010861` — `chr08:6491367`
- `OG0037990` — `og_plus_sv` — `EV0009290` — `chr07:6396056`
- `OG0037477` — `og_plus_sv` — `EV0009289` — `chr07:6373950`
- `OG0040487` — `og_plus_sv` — `EV0010861` — `chr08:6491367`
- `OG0048464` — `og_plus_sv` — `EV0009297` — `chr07:6657938`

### Interpretation

There are visible candidate regions, but the minority group has only `2`
cultivars. This is not enough for a strong trait-level story.

### Bottom Line

Keep the list as a follow-up candidate inventory, not a strong biological
claim.

## 6. Panicle Length

### Group Structure

- labels: `short` vs `long`
- group counts used: `10` vs `1`

### Output Size

- selected OGs at step 2: `1,026 / 53,539`

### Interpretation

This is essentially a single-cultivar contrast. The output is useful only as a
hint list for that special contrast, not as a robust trait-associated pattern.

### Bottom Line

Do not over-interpret this trait in the current panel.

## 7. Panicle Number

### Group Structure

- labels: `low` vs `high`
- group counts used: `7` vs `2`
- borderline samples excluded

### Output Size

- selected OGs at step 2: `179 / 53,539`

### Representative Top Candidates

- `OG0050827` — `og_plus_sv` — `EV0002516` — `chr02:19439750`
- `OG0002623` — `cnv_dosage` — `EV0008035` — `chr06:18136418`
- `OG0040470` — `og_plus_sv` — `EV0009693` — `chr07:20707047`

### Interpretation

The candidate count is manageable, but the group balance is still weak.
This trait can be revisited later, but it is not a main interpretive result
from this run.

## 8. Pre-harvest Sprouting

### Group Structure

- labels: `low` vs `high`
- group counts used: `4` vs `3`
- only `7` cultivars had observations

### Output Size

- selected OGs at step 2: `177 / 53,539`

### Representative Top Candidates

- `OG0045154` — `og_plus_sv` — `EV0004117` — `chr04:2361638`
- `OG0045155` — `og_plus_sv` — `EV0004117` — `chr04:2361638`
- `OG0002111` — `og_plus_sv` — `EV0004129` — `chr04:2447086`

### Interpretation

The localized chr04 signal is worth remembering, but this trait remains under-
powered in the current dataset.

## 9. Ripening Rate

### Group Structure

- labels: `low` vs `high`
- group counts used: `2` vs `9`

### Output Size

- selected OGs at step 2: `312 / 53,539`

### Representative Top Candidates

- `OG0048209` — `og_plus_sv` — `EV0010569` — `chr08:4190719`
- `OG0000271` — `cnv_dosage` — `EV0012566` — `chr09:2783846`
- `OG0037159` — `og_plus_sv` — `EV0016932` — `chr11:27341397`

### Interpretation

There are interesting loci, including one overlapping the BLB chr11 region,
but the `2`-sample minority group means the trait should not be treated as
settled.

## Shared Blocks Across Traits

The strongest shared blocks from the block follow-up were:

- `chr11 21–22 Mb` — shared by
  `bacterial_leaf_blight`, `culm_length`, `heading_date`,
  `spikelets_per_panicle`
- `chr06 10–11 Mb` — shared by
  `bacterial_leaf_blight`, `culm_length`, `heading_date`
- `chr11 20–21 Mb` — shared by
  `culm_length`, `heading_date`, `spikelets_per_panicle`
- `chr11 22–23 Mb` — shared by
  `culm_length`, `heading_date`, `spikelets_per_panicle`
- `chr11 23–24 Mb` — shared by
  `culm_length`, `heading_date`, `spikelets_per_panicle`
- `chr11 24–25 Mb` — shared by
  `bacterial_leaf_blight`, `culm_length`, `heading_date`

### Main Interpretation

This cross-trait recurrence strongly suggests linked background structure or
shared haplotype blocks in the panel.

That does **not** prove that one OG directly controls multiple traits.
It means the current panel cannot yet cleanly separate those nearby signals.

## Recurrent OGs Worth Remembering

These OGs recur across multiple top candidate sets and are useful as anchor
names when reviewing the result tables:

- `OG0040978`
- `OG0041302`
- `OG0042515`
- `OG0043142`
- `OG0044601`
- `OG0044626`
- `OG0044635`

These should be treated as **block-associated recurrent signals** first.

## First Curated Blocks

The first manual curation pass was materialized into three block bundles on
the server:

### 1. `heading_shared_chr06`

- region: `chr06:9–11 Mb`
- traits:
  `heading_date`, `culm_length`
- contents:
  `candidates.tsv`, `intersections.tsv`, `summary.md`

This bundle is useful for checking how many OGs in the heading/culm signal
are really just one chr06 neighborhood.

### 2. `shared_chr11_dev_block`

- region: `chr11:21–25 Mb`
- traits:
  `heading_date`, `culm_length`, `spikelets_per_panicle`

This is the single most important bundle from the entire run. It represents
the shared developmental block driving a large fraction of the top hits.

### 3. `blb_chr11_resistance_block`

- region: `chr11:27–29 Mb`
- trait:
  `bacterial_leaf_blight`

This is the best bundle for function-oriented manual review because it already
contains WAK- and NLR-like annotated candidates.

## What I Think The Results Mean

If the results are reduced to a small number of take-home messages, they are:

1. The current 11-cultivar panel contains strong local block structure.
2. `heading_date` is the clearest overall trait signal.
3. `culm_length` and `spikelets_per_panicle` largely ride with the same
   chr11-centered developmental block.
4. `bacterial_leaf_blight` has the clearest functionally interpretable
   resistance-like candidate block.
5. The remaining traits are still useful for candidate collection, but not for
   strong interpretation.

## What Should Be Done Next

The most productive next steps are not more whole-panel ranking passes.
They are manual block-focused reviews.

Recommended order:

1. `shared_chr11_dev_block`
   Narrow the recurrent developmental block to a smaller OG list by repeated
   SVs, annotation, and cultivar pattern.
2. `blb_chr11_resistance_block`
   Separate the WAK/NLR-like candidates from the rest and review them as the
   main BLB block.
3. `heading_shared_chr06`
   Decide how much of the heading/culm signal on chr06 is independent from the
   chr11 block.

## Where To Find The Tables

### Main trait-wide outputs

- `step2_orthogroups/*.tsv`
- `step3_sv_top/*.tsv`
- `step4_intersections/*.tsv`
- `step5_candidates/*.tsv`

### Block-focused outputs

- `followup_block_summary.tsv`
- `followup_shared_ogs.tsv`
- `curated_blocks/*/candidates.tsv`
- `curated_blocks/*/intersections.tsv`

## Final Caution

This run is already useful.

But it is useful because it narrows the search space, not because it proves
biological mechanism. The correct interpretation is:

- these are **candidate blocks**
- these contain **candidate OGs**
- some of them have functionally plausible annotations
- they now justify a more focused next analysis

That is already a good outcome for the current panel size.

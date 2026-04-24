# Follow-up Block Summary — 2026-04-22

Status: completed from the raw run at
`/10Gdata/ezy/02_Ongoing_Projects/00_Main/Green_Rice/results/analysis/raw_workflow_20260422/full_run`.

Supporting script in this repo:

- `scripts/summarize-analysis-blocks.py`

Generated server outputs:

- `followup_block_report.md`
- `followup_block_summary.tsv`
- `followup_shared_ogs.tsv`
- `curated_blocks/heading_shared_chr06/*`
- `curated_blocks/shared_chr11_dev_block/*`
- `curated_blocks/blb_chr11_resistance_block/*`

This follow-up intentionally compresses OG-level candidates into
**block-level signals** so repeated hits from one structural region are not
misread as independent loci.

## Shared Blocks Across Traits

Across the top 50 candidates of the focus traits
(`heading_date`, `culm_length`, `spikelets_per_panicle`,
`bacterial_leaf_blight`), the strongest shared blocks are:

- `chr11:21–22 Mb` — shared by all four focus traits
- `chr06:10–11 Mb` — shared by `bacterial_leaf_blight`,
  `culm_length`, `heading_date`
- `chr11:20–21 Mb` — shared by `culm_length`,
  `heading_date`, `spikelets_per_panicle`
- `chr11:22–23 Mb` — shared by `culm_length`,
  `heading_date`, `spikelets_per_panicle`
- `chr11:23–24 Mb` — shared by `culm_length`,
  `heading_date`, `spikelets_per_panicle`
- `chr11:24–25 Mb` — shared by `bacterial_leaf_blight`,
  `culm_length`, `heading_date`

This is the clearest evidence in the current run that the main signals are
block-like rather than OG-isolated.

## Focus Trait Interpretation

### Heading Date

Two hotspot families dominate:

- `chr06 9–11 Mb`
- `chr11 24–25 Mb`, extending into `28–29 Mb`

Within `chr06 10–11 Mb`, repeated events such as `EV0007248`,
`EV0007287`, and `EV0007272` recur across multiple top OGs. That pattern is
consistent with one locus neighborhood producing many adjacent OG hits.

### Culm Length

The dominant hotspot is:

- `chr11 22–23 Mb`

The same region also contains repeated signals for heading date and spikelets
per panicle. This makes it more likely that culm-length hits in this region
reflect a shared background block than a culm-length-specific mechanism.

### Spikelets Per Panicle

The top 50 candidates are concentrated almost entirely on:

- `chr11 21–24 Mb`

This is the strongest single-trait block collapse in the follow-up summary.
It should be treated as a single high-priority region with many linked OGs,
not as dozens of disconnected candidates.

### Bacterial Leaf Blight

The main block remains:

- `chr11 27–29 Mb`

with secondary support on:

- `chr11 18–19 Mb`
- `chr11 25–26 Mb`
- `chr04 7–8 Mb`

This trait differs from the morphology/yield traits because the annotated
top OGs contain more plausible defense-related functions.

## Recurrent OGs

The follow-up shared-OG summary highlights several OGs that recur across
multiple top candidate sets:

- `OG0040978`
- `OG0041302`
- `OG0042515`
- `OG0043142`
- `OG0044601`
- `OG0044626`
- `OG0044635`

Important reading rule:

- recurrence across `heading_date`, `culm_length`, and
  `spikelets_per_panicle` should first be treated as evidence for a shared
  block or linked haplotype, not as proof that the same OG directly explains
  multiple traits

## Annotated Candidates Worth Manual Review

Within the current top blocks, these annotated OGs are worth inspecting first:

### Bacterial Leaf Blight

- `OG0042703` — WAK-like annotation
- `OG0001738` — NLR-like annotation
- `OG0000297` — coiled-coil NBS-LRR / resistance-like annotation

### Morphology / Yield Shared Blocks

- `OG0044601` — NLR-like annotation
- `OG0041273` — NLR-like annotation
- `OG0044635` — barley stem rust resistance-like annotation
- `OG0039710` — UPF0005-domain annotation

These should still be interpreted cautiously because many defense-family
genes occur in duplicated or structurally variable blocks and may ride with
the block rather than define the phenotype.

## Curated Block Bundles

The first manual curation pass was already materialized into three server-side
bundles:

1. `curated_blocks/heading_shared_chr06/`
   Region: `chr06:9–11 Mb`
   Traits: `heading_date`, `culm_length`
2. `curated_blocks/shared_chr11_dev_block/`
   Region: `chr11:21–25 Mb`
   Traits: `heading_date`, `culm_length`, `spikelets_per_panicle`
3. `curated_blocks/blb_chr11_resistance_block/`
   Region: `chr11:27–29 Mb`
   Trait: `bacterial_leaf_blight`

Each bundle contains:

- `candidates.tsv`
- `intersections.tsv`
- `summary.md`

These bundles are the practical review units for the next biological pass,
because they keep repeated SVs and neighboring OGs in the same inspection
context instead of scattering them across trait-wide tables.

# Candidate Discovery Selection Plan

## Purpose

This document defines the improved selection model for Discovery candidates.
The current pipeline is useful as a broad screening pass, but it is too loose
to be the final "what should I inspect first?" answer shown on locus detail
pages.

The new model separates three concepts that are currently blurred:

1. **Discovery hit** — a broad OG or SV signal found by the workflow.
2. **Review locus** — a genomic region where many hits may be tagging the same
   linked structural background.
3. **Priority lead** — the specific OG, gene, SV, or region a visitor should
   inspect first inside a review locus.

The key rule is simple:

> Do not rank raw OG rows as if they were independent biological candidates
> when the evidence is actually block-like.

## Current Pipeline Summary

The current raw workflow starts with phenotype-defined cultivar groups for a
trait, then compares OG copy counts between the two groups.

Current selection logic:

- Test every OG with Mann-Whitney U on copy count.
- Compute `meanDiff`, `presenceDiff`, `pValue`, `qValue`, and log2 fold change.
- Select OGs passing:
  - `pValue < 0.05`
  - `meanDiff >= 0.5`
- If fewer than 5 OGs pass, relax to `pValue < 0.10`.
- If still too few pass, emit top 10 by raw p-value.
- Score selected OGs with:
  - 50% group specificity
  - 25% function annotation present/absent
  - 25% OG presence gap
  - optional SV bonus up to 0.25

This is acceptable as a **screening hit list**. It is not sufficient as a
final lead-ranking model.

## Problems To Fix

### 1. Too many OGs are called candidates

Some traits produce hundreds or more than one thousand selected OGs. That is a
useful discovery inventory, but not a practical review list.

A database visitor needs a smaller answer:

- which locus matters?
- which OG/SV should I inspect first?
- why is it above nearby alternatives?

### 2. Raw p-value is doing too much work

The 11-cultivar MVP panel is too small for a GWAS-like claim. BH-adjusted
q-values are often uninformative, so the current workflow uses raw p-value plus
effect size. That is defensible for exploration, but it must be presented as
screening evidence, not final confidence.

### 3. Group imbalance is not strong enough in the ranking

Traits with extreme group splits can still produce ranked candidates. Those
rows should not be visually equivalent to balanced traits.

Examples of low-confidence grouping contexts:

- one group has only 2 cultivars
- one group has 10 cultivars and the other has 1
- many cultivars are borderline or missing

### 4. Regulatory SV candidates can be missed

The current workflow selects OGs first, then attaches SV evidence to selected
OGs. This can miss a real review pattern where:

- OG copy count is similar between groups
- the OG is present in both groups
- a promoter or nearby SV is group-specific

That pattern should enter Discovery as an SV-first hit, not only as an OG
copy-count hit.

### 5. Function score is too shallow

The current function axis mostly asks whether any annotation exists. That is
not the same as asking whether the annotation is relevant to the trait or
biological category.

### 6. Block-like evidence is being shown as independent OG evidence

The strongest chr06 and chr11 patterns look like linked review regions. Many
OGs in the same region may be tagging the same background. The UI and scoring
must make that clear.

## New Conceptual Model

### Level 1. Discovery Hit

A discovery hit is any broad signal emitted by the workflow.

Examples:

- OG copy-count contrast between trait groups
- OG presence/absence contrast between trait groups
- SV group-frequency contrast
- OG x SV intersection
- annotated OG in a high-signal region

Discovery hits are not all shown as top leads. They are evidence rows.

### Level 2. Review Locus

A review locus groups nearby hits into a region-level interpretation unit.

The review locus answers:

- where is the signal?
- which traits point to this region?
- are the hits likely independent, or linked?
- which SVs and OGs recur in the region?

Review loci should be the main unit on Discovery home and locus detail pages.

### Level 3. Priority Lead

A priority lead is the practical next inspection target inside a review locus.

It can be:

- an OG
- a gene
- an SV
- an OG + SV pair
- a small subregion

Priority leads must include a visible explanation. A user should not need to
reverse-engineer why a card is ranked first.

## Selection Gates

Before ranking, each trait context receives a grouping quality label.

### Grouping Quality

| Label | Criteria | UI meaning |
|---|---|---|
| `balanced` | both groups have enough samples and no severe split | normal confidence |
| `usable_imbalanced` | both groups exist, but one is small | show caution |
| `screening_only` | extreme split, missingness, or weak grouping | do not promote as high confidence |

Initial MVP thresholds:

- `balanced`: smallest group `n >= 4` and largest/smallest ratio `<= 2.5`
- `usable_imbalanced`: smallest group `n >= 2`
- `screening_only`: smallest group `< 2` or ratio `> 5`

These thresholds should be stored with the run so future releases can change
them without changing old interpretation.

### Discovery Hit Gates

OG-copy hit:

- require `meanDiff >= 0.5`
- prefer `presenceDiff >= 0.25` or clear copy-number difference
- raw p-value may be used as evidence, but not as sole confidence

SV-frequency hit:

- require group ALT-frequency gap, for example `gap >= 0.5`
- keep group counts visible
- do not call causal or marker-ready

OG-SV hit:

- require SV overlap with a primary genomic interval: CDS/splice, UTR, intron,
  promoter 2 kb, upstream 2-10 kb, or downstream 2 kb
- score by primary impact class and group-frequency gap
- do not use local cluster, CNV, inversion, or TE context as `impactClass`

Function hit:

- separate "has annotation" from "trait-relevant annotation"
- use trait/domain keyword categories where available
- never let annotation alone make a high-confidence lead

## Priority Lead Scoring

Priority leads should be ranked by a composite score, but the score must be
explainable.

Recommended ingredients:

| Axis | Meaning |
|---|---|
| `ogContrast` | copy count / presence difference between trait groups |
| `svContrast` | lead SV ALT-frequency gap between groups |
| `ogSvCoupling` | whether the SV intersects or plausibly explains the OG signal |
| `functionRelevance` | annotation relevance, not merely annotation existence |
| `traitSupport` | same OG/locus recurring across multiple trait contexts |
| `groupingQuality` | penalty for small or imbalanced groups |
| `blockIndependence` | penalty when many hits likely tag the same linked block |

Important ranking rule:

> Cross-trait recurrence is support, not an automatic first-sort key.

The previous locus card logic placed multi-trait recurrence above score. That
is useful for finding shared blocks, but it is not enough for selecting the
best lead inside a locus.

## Confidence Labels

Every priority lead should carry one of these labels.

### `high_review_priority`

Use when most of the following are true:

- grouping quality is balanced or acceptable
- OG contrast is strong
- SV contrast is strong or an SV plausibly explains the OG
- function annotation is interpretable
- the lead is not merely one row among many equivalent linked OGs

### `medium_review_priority`

Use when some evidence is strong, but one major axis is missing.

Examples:

- strong OG contrast but no SV support
- strong SV support but weak function annotation
- good signal in an imbalanced trait

### `screening_only`

Use when the signal may be useful but should not be promoted as a strong lead.

Examples:

- severe group imbalance
- raw p-value only
- no clear OG/SV coupling
- likely block hitchhiking

## UI Requirements

### Discovery home

The home page should prioritize review loci, not raw OG rows.

Required fields:

- locus label and region
- traits represented
- grouping quality badges
- number of OG hits and SV hits
- whether the signal is block-like
- best priority lead summary

### Locus detail

The detail page should answer these questions in order:

1. What is this locus?
2. Which trait groups point to it?
3. Which OG/SV should I inspect first?
4. Why is this lead ranked first?
5. Do cultivars show the expected SV pattern?
6. Is this a likely linked block rather than independent candidates?

Priority lead cards must show:

- lead type: OG, SV, OG+SV, or region
- confidence label
- top evidence bullets
- score ingredients, not only one total score
- links to OG, gene, SV/region, candidate row, and source block

Example explanation:

```text
Why this lead
- strong OG copy/presence contrast in heading-date groups
- lead SV differs by 62 percentage points between groups
- SV overlaps a candidate gene body
- annotation: NLR-like domain
- caution: this region is part of a broader chr11 linked block
```

### Candidate table

Raw candidate rows should remain available, but as supporting detail.

They should be labelled as:

```text
Screening rows from the workflow, not independent validated candidates.
```

## Pipeline Implementation Plan

### Phase 1. Documentation and UI language

- Rename broad rows as `Discovery hits` or `screening candidates` in UI copy.
- Keep `Candidate` as the backend object for compatibility, but explain that
  it is run-scoped and discovery-only.
- Add visible "Why this lead" bullets to locus lead cards.

### Phase 2. Add derived lead scoring in the web layer

Without changing server artifacts yet:

- derive `traitSupport`
- derive `svContrast` from existing SV group-frequency bundles
- derive grouping quality from group counts
- derive block-like caution from number of hits in a locus
- rank top review leads by explainable composite score

This is the safest short-term change because it does not require regenerating
server artifacts.

### Phase 3. Update server scoring artifacts

Add explicit fields to Step 5 output:

- `groupingQuality`
- `priorityScore`
- `priorityLabel`
- `leadEvidenceBullets`
- `ogContrastScore`
- `svContrastScore`
- `functionRelevanceScore`
- `traitSupportScore`
- `blockHitchhikingPenalty`

The old `combinedScore` can remain for backward compatibility, but new UI
should prefer `priorityScore` when available.

### Phase 4. Add SV-first candidates

Generate SV-first hits before OG filtering:

- scan top group-specific SVs
- intersect with all nearby genes/OGs, not only Step 2 selected OGs
- emit `sv_regulatory` or `sv_near_gene` review hits when OG copy count is
  unchanged but SV contrast is strong

This addresses the main blind spot in the current OG-first workflow.

### Phase 5. Recompute and promote

Server recompute is needed only after Phase 3 or Phase 4.

Expected steps:

1. run updated raw analysis on the analysis server
2. generate follow-up block summaries
3. promote to Firestore/Storage with a new scoring version
4. keep old `sc1` runs readable
5. make representative-run selection prefer the newest scoring version

## Data Contract Changes

Candidate docs should eventually include:

```ts
priorityScore: number | null;
priorityLabel: 'high_review_priority' | 'medium_review_priority' | 'screening_only' | null;
leadEvidenceBullets: string[];
groupingQuality: 'balanced' | 'usable_imbalanced' | 'screening_only';
scoreComponents: {
  ogContrast: number;
  svContrast: number;
  ogSvCoupling: number;
  functionRelevance: number;
  traitSupport: number;
  groupingPenalty: number;
  blockPenalty: number;
};
```

Review locus docs should eventually include:

```ts
reviewModel: 'block_like' | 'candidate_cluster' | 'single_lead';
priorityLeadIds: string[];
sharedTraitIds: string[];
blockCaution: string | null;
```

## Validation Checks

Before publishing a new scoring version:

- inspect the top 20 leads per major trait
- inspect all curated loci
- confirm no extreme-imbalance trait produces high-priority leads
- confirm known block-like regions are labelled as block-like
- confirm SV-first hits appear when OG copy count is unchanged
- compare old `combinedScore` rank vs new `priorityScore` rank

## Non-Goals

The improved model still does not claim:

- causal genes
- validated PAV
- marker-ready SVs
- breeding recommendations
- generalization outside the Korean temperate japonica panel

Discovery remains a prioritization workflow, not a validation workflow.

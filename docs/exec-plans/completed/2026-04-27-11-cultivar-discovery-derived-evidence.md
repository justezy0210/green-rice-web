# 11-cultivar Discovery derived evidence rollout

Status: abandoned — 2026-04-27

## Goal

Improve the 11-cultivar pre-release Discovery database using only data that is
already available in the project. The user-facing result should be a clearer
answer to:

- which review locus should I inspect?
- which OG/gene/SV is the first practical lead?
- why is it prioritized?
- does the SV pattern separate the 11 cultivars by the trait grouping?
- how cautious should I be with this signal?

This plan does **not** require external QTL, RNA-seq, wet-lab validation,
16-cultivar SV evidence, or true haplotype-block inference.

## Current Data We Can Use

- 11-cultivar trait groupings from `data/analysis_groupings_v4.json`.
- OG copy-count group comparisons from Step 2 artifacts / promoted candidates.
- Candidate docs under `analysis_runs/{runId}/candidates`.
- Candidate blocks under `analysis_runs/{runId}/blocks`.
- OG x SV intersections from Step 4 artifacts.
- SV matrix release `sv_v1`:
  - event metadata by chromosome
  - per-cultivar genotype codes
  - per-trait group ALT frequency bundles
- Existing OG/gene/entity detail pages and region browser links.

## Non-Goals

Do not claim or build:

- causal genes or causal SVs
- marker-ready variants
- validated PAV or gene absence
- 16-cultivar Discovery evidence
- expression support
- external QTL/GWAS overlap
- true haplotype or recombination block boundaries

The output remains **candidate discovery only**.

## Deliverables

### 1. Grouping Quality

Add a derived label for each trait context:

| Label | Meaning |
|---|---|
| `balanced` | usable group split for 11-cultivar discovery |
| `usable_imbalanced` | usable but should carry a caution |
| `screening_only` | too imbalanced for high-priority promotion |

Initial criteria:

- `balanced`: smallest group `n >= 4` and largest/smallest ratio `<= 2.5`
- `usable_imbalanced`: smallest group `n >= 2`
- `screening_only`: smallest group `< 2` or largest/smallest ratio `> 5`

UI use:

- show the label on Discovery run, locus, block, and lead cards
- prevent `screening_only` traits from producing high-priority lead labels

### 2. SV-first Discovery Hits

Create a derived SV-first hit list from existing `sv_v1` group frequency data.

Logic:

1. For each trait, scan SV events with group ALT-frequency gap.
2. Keep high-gap events, for example `gap >= 0.5`.
3. Join candidate/nearby gene or OG context where available:
   - existing OG x SV intersections
   - candidate best SVs
   - region/gene links from existing indexes where possible
4. Emit these as SV-first review hits, even when OG copy contrast is weak.

User-facing value:

- surfaces regulatory or structural signals that the current OG-first pipeline
  can miss
- answers "which SV differs by cultivar group?"

### 3. Review Locus Priority Score

Build a derived locus-level priority score without regenerating server
artifacts.

Score ingredients:

| Axis | Source |
|---|---|
| OG contrast | candidate `meanDiff`, `presenceByGroup`, `combinedScore` |
| SV contrast | `sv_v1` group frequency gap |
| OG-SV coupling | candidate `bestSv`, block `leadSvs`, Step 4 intersections |
| trait support | number of trait contexts in the review locus |
| grouping quality | derived label and penalty |
| block-like caution | number of nearby OG/SV hits in the same review locus |
| function signal | existing function summary / annotation presence |

Important rule:

> Trait recurrence is support, not an automatic first-sort key.

The score should rank "best lead to inspect first", not merely "most repeated
across traits".

### 4. Priority Lead Explanation

Every top lead should include generated evidence bullets.

Example:

```text
Why this lead
- strong OG copy/presence contrast
- lead SV differs by 62 percentage points between groups
- SV overlaps candidate gene body
- observed in 2 trait contexts
- caution: broader chr11 linked review region
```

Required bullet sources:

- candidate score/rank
- OG presence/copy contrast
- SV group-frequency gap
- impact class if available
- trait recurrence
- grouping quality caution
- block-like caution

### 5. Cultivar-level SV Pattern

Extend the current SV pattern surface into a reusable evidence view.

For each lead SV:

- show trait group ALT frequency bars
- show per-cultivar genotype strip
- show SV type, coordinate, and event ID
- show `originalId` in tooltip/detail when available

User-facing value:

- makes group summary auditable at the individual cultivar level

### 6. Block-like Signal Score

Derive a caution score for review loci where many hits cluster together.

Inputs:

- candidate count in the review locus
- SV count / repeated lead SV count
- number of traits pointing to the region
- number of neighboring OGs with similar evidence

Labels:

| Label | Meaning |
|---|---|
| `single_lead` | one main OG/SV explains the signal best |
| `candidate_cluster` | several candidate rows share a local region |
| `block_like` | many OG/SV hits likely tag linked background |

UI use:

- show a visible caution on locus and lead cards
- avoid presenting many nearby OGs as independent candidates

### 7. Trait Recurrence Matrix

Add a compact matrix for review loci:

- rows: priority OG/SV leads or grouped lead units
- columns: trait contexts
- cells: evidence strength and available axis

Cell states:

- OG contrast
- SV contrast
- OG + SV coupled
- function annotation
- screening-only caution

User-facing value:

- shows whether the locus is repeated for the same reason across traits or
  only shares a broad region.

## Implementation Phases

### Phase 1. Derived Evidence Helpers

Add lib helpers only.

Files likely involved:

- `src/lib/discovery-grouping-quality.ts`
- `src/lib/discovery-priority-score.ts`
- `src/lib/discovery-sv-first-hits.ts`
- `src/lib/discovery-lead-explanations.ts`

Responsibilities:

- compute grouping quality from group labels/counts
- compute lead score components
- compute evidence bullets
- compute block-like label
- preserve existing Firestore schema

Verification:

- unit-style fixture tests if current test pattern supports it
- `npm run type-check`
- `npm run lint`
- `npm run check:arch`

### Phase 2. Locus Detail UI Upgrade

Update `/discovery/locus/:locusSlug`.

Changes:

- show grouping quality badges
- replace raw "top by recurrence" sorting with priority score sorting
- add `Why this lead` bullets
- keep SV group bars and cultivar genotype strip
- show block-like caution near the lead list
- leave raw candidate rows as supporting detail only

Files likely involved:

- `src/components/discovery/TopCandidateLeads.tsx`
- `src/components/discovery/SvPatternByGroup.tsx`
- `src/components/discovery/LocusEvidenceMatrix.tsx`
- `src/pages/DiscoveryLocusPage.tsx`

Verification:

- check `/discovery/locus/chr11-21-25mb-development`
- check a BLB locus
- check a single-trait auto locus

### Phase 3. Discovery Home / Matrix Upgrade

Update `/discovery` so the entry point is review-locus-first.

Changes:

- show best priority lead per locus
- show grouping quality summary
- show block-like/single-lead label
- show trait recurrence matrix with evidence-type cells

Files likely involved:

- `src/components/discovery/LocusTraitMatrix.tsx`
- `src/components/discovery/DiscoveryShell.tsx`
- `src/lib/discovery-block-groups.ts`

### Phase 4. SV-first Review Hit Surface

Add derived SV-first hits to the relevant locus/block surfaces.

Short-term approach:

- derive hits client-side from existing SV group frequency and block/candidate
  context
- show them as a separate section:

```text
SV-first hits
```

Longer-term approach:

- promote derived SV-first hits into server artifacts under a new scoring
  version

### Phase 5. Optional Server Recompute

Only needed after the UI-derived model is validated.

Expected server-side additions:

- `priorityScore`
- `priorityLabel`
- `groupingQuality`
- `scoreComponents`
- `leadEvidenceBullets`
- SV-first candidate rows

Promotion rule:

- use a new scoring version, for example `sc2`
- keep existing `sc1` runs readable
- update representative run selection only after manual review

## Suggested UI Order

For locus detail:

```text
1. Locus summary
2. Grouping quality / caveat strip
3. Priority leads with Why-this-lead bullets
4. SV pattern by group + cultivar genotype strip
5. Trait recurrence matrix
6. Block-like signal explanation
7. Raw screening rows / export
```

For Discovery home:

```text
1. Review locus matrix
2. Trait support / grouping quality
3. Best priority lead per locus
4. Block-like caution
```

## Validation Checklist

Before marking this rollout complete:

- [ ] `screening_only` traits do not produce `high` priority labels.
- [ ] chr11 development locus is labelled as block-like or candidate cluster.
- [ ] BLB resistance locus keeps function annotations visible.
- [ ] SV-first hits are visible when a high-gap SV lacks strong OG contrast.
- [ ] Priority lead ranking is explainable from visible bullets.
- [ ] Cultivar genotype strip agrees with group ALT-frequency bars.
- [ ] Existing OG/gene/region/source block links remain reachable.
- [ ] `npm run type-check`
- [ ] `npm run lint`
- [ ] `npm run check:arch`
- [ ] `npm run build`

## Rollout Order

Recommended order:

1. grouping quality
2. priority score components
3. why-this-lead bullets
4. block-like signal label
5. trait recurrence matrix
6. SV-first hit section
7. optional server scoring version

This order improves user interpretation first, then adds new discovery
coverage.

## Open Questions

- Should `gap >= 0.5` be the default SV-first threshold, or should it depend on
  group size?
- Should block-like penalty lower ranking, or only add a caution label?
- Should function relevance remain keyword-based for the pre-release, or be
  curated only for focus traits?
- Should derived priority scores be shown numerically, or only as labels and
  evidence bullets?

## Result

- Status: ABANDONED
- Reason: superseded by the later product direction to stop adding derived
  Discovery layers and simplify the public database surface.
- Follow-up direction: keep only the user-facing Discovery main and locus detail
  pages, and remove the heavy/internal pipeline pages from public routing.

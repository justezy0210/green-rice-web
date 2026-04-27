# Discovery locus evidence table semantics

## Goal

Fix the confusing mismatch in the Discovery locus detail table where a row can
show a large OG count, only three `OG signal` chips, and `SV signal none`.

## Problem

Those values are not the same kind of evidence:

- `candidateOgCount` is a block-level inventory count.
- `topOgIds.slice(0, 3)` is only a small convenience sample.
- `leadSvs[0]` is a block-summary lead SV, not the full set of candidate-level
  SV signals used by the SV pattern section.

Displaying them side by side makes the table look internally inconsistent.

## Decision

The `Why this locus is listed` table should explain which trait comparisons
selected the same window and how much discovery inventory each comparison
contributed. It should not show partial OG/SV examples.

SV-specific interpretation belongs in `SV patterns across groups`.

## Implementation Tasks

- Remove `OG signal` and `SV signal` columns from the locus evidence table.
- Rename table columns to user-facing concepts:
  - `Groups` -> `Group comparison`
  - `Evidence type` -> `Review type`
  - `Evidence` -> `Discovery inventory`
- Add copy clarifying that counts are run-level inventory totals.

## Verification

- `npm run type-check`
- `npm run lint`
- `npm run check:arch`
- `npm run build`
- `git diff --check`

## Result

- Removed partial `OG signal` and `SV signal` columns from the locus evidence
  table.
- The table now shows only the trait comparison, review type, and discovery
  inventory totals.
- `Discovery inventory` explicitly labels candidate OG rows and OG-SV overlap
  rows.
- The page copy now says these are inventory totals, not displayed record
  counts.

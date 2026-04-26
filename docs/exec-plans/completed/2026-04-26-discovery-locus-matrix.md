# [PLAN] Replace Review locus map with locus-trait matrix

## Goal

Replace the chromosome-lane `Review locus map` with a more useful
locus-first matrix on `/discovery`.

The first screen should answer:

- which locus should be reviewed first
- which traits point to it
- how many candidate OGs and intersections support it
- whether the row is curated or auto-generated
- where to click next

## Scope

- Remove the full-width chromosome lane visualization from the Discovery home.
- Add a compact `LocusTraitMatrix` component.
- Each row should show:
  - locus label and region
  - small coordinate marker only as secondary context
  - trait chips
  - total candidate OGs
  - total intersections
  - curated/auto state
  - open link to the representative block detail
- Remove the separate `ReviewQueue` from the home if it duplicates the matrix.

## Verification

- [x] `npm run type-check`
- [x] `npm run lint`
- [x] `npm run check:arch`
- [x] `npm run build`
- [x] `git diff --check`

## Result

- Status: completed on 2026-04-26.
- Notes:
  - Replaced the chromosome-lane `ReviewLocusMap` with `LocusTraitMatrix`.
  - Removed the separate `ReviewQueue` from `/discovery` because the new
    matrix now owns locus priority, trait chips, candidate OG totals,
    intersection totals, curation state, and the block-detail link.
  - Kept coordinate context as a small inline marker inside each locus row
    instead of a primary genome-lane visualization.

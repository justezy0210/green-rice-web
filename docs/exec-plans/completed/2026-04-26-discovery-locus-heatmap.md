# [PLAN] Convert Discovery locus matrix to trait heatmap

## Goal

Rewrite the `/discovery` locus matrix so rows are loci and columns are traits.
The matrix should make repeated loci across traits obvious at a glance.

## Design

- Row = grouped review locus.
- Column = representative trait run.
- Cell filled when that trait has a block in the locus group.
- Cell intensity = `candidateOgCount` relative to the strongest cell.
- Row accent marks curated loci.
- Keep locus label, region, small coordinate marker, total OGs, total
  intersections, and `Open` link.

## Verification

- [x] `npm run type-check`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `git diff --check`

## Result

- Status: completed on 2026-04-26.
- Notes:
  - Reworked `LocusTraitMatrix` into a heatmap-style table with locus rows and
    trait columns.
  - Cell labels show per-trait `candidateOgCount`; color intensity is relative
    to the strongest block in the current matrix.
  - Kept region, coordinate marker, total OGs, total intersections, curated/auto
    state, and `Open` link.

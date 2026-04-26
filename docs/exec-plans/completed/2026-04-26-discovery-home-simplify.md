# [PLAN] Simplify Discovery home

## Goal

Reduce `/discovery` to the information users actually need on first load:
which candidate loci deserve review, which traits have candidates, and where
to click next.

## Changes

- Keep `/discovery` route and Discovery naming.
- Keep representative-run filtering so totals do not double-count `sv0/sc0`.
- Keep review-locus map and review queue as the primary content.
- Simplify the snapshot to a compact 3-number strip.
- Simplify the trait run list to a compact navigation table.
- Remove first-screen blocks that are mostly operational noise:
  - trait candidate/block distribution chart
  - evidence readiness matrix
  - per-row readiness badges and excess action buttons

## Verification

- [x] `npm run type-check`
- [x] `npm run lint`
- [x] `npm run check:arch`
- [x] `npm run build`
- [x] `git diff --check`

## Result

- Status: completed on 2026-04-26.
- Notes:
  - Removed the low-value trait distribution chart and evidence readiness
    matrix from `/discovery`.
  - Reduced the snapshot from a metric card grid to a compact 3-number strip.
  - Simplified trait rows to candidate count, block state, and three text
    links.
  - Kept the locus map and review queue as the primary discovery content.

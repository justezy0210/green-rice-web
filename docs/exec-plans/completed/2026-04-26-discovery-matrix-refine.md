# [PLAN] Refine Discovery locus matrix

## Goal

Remove the low-value `Current discovery set` strip from `/discovery` and
evaluate a clearer display model for the locus-trait matrix.

## Scope

- Remove the `DiscoverySnapshot` card from the `/discovery` home.
- Delete the now-unused snapshot component if no other import remains.
- Keep the current `LocusTraitMatrix` functional for now.
- Decide the next display direction for the matrix before another UI rewrite.

## Verification

- [x] `npm run type-check`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `git diff --check`

## Result

- Status: completed on 2026-04-26.
- Notes:
  - Removed the `Current discovery set` strip from `/discovery`.
  - Deleted the unused `DiscoverySnapshot` component.
  - Kept `LocusTraitMatrix` functional while evaluating a better presentation
    model for the next UI pass.

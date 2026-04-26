# Discovery detail table style

## Goal

Align the table styling of Discovery detail pages with the softer row-band
style used by the Discovery locus matrix and OG index table.

## Scope

- `/discovery/:runId/blocks`
- `/discovery/:runId/candidates`
- `/discovery/locus/:locusSlug`
- Other Discovery step tables that share the same dense-table surface:
  phenotype, intersections, and variants.

## Steps

1. Add a small Discovery table style helper so repeated dense-table classes
   stay consistent.
2. Apply the helper to Discovery detail table surfaces.
3. Preserve existing links, data columns, filters, and pagination.
4. Run `type-check`, `lint`, and `build`.

## Result

Completed.

- Added a shared Discovery table style helper.
- Applied row-band table styling to Discovery blocks, candidates,
  phenotype, intersections, variants, cross-trait comparison, and block
  candidate tables.
- Preserved existing data columns, filters, pagination, and route targets.
- Verification passed: `type-check`, `lint`, `check:arch`, and `build`.

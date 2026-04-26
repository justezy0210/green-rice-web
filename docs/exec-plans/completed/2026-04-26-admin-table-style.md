# Admin table style

## Goal

Align the Admin cultivar table with the row-band table style now used by
Discovery detail tables and the OG index.

## Scope

- `src/components/admin/CultivarTable.tsx`

## Steps

1. Apply dense row-band table styling.
2. Preserve current columns and edit/delete actions.
3. Run focused frontend checks.

## Result

Completed.

- Applied dense row-band styling to `CultivarTable`.
- Added fixed column sizing for stable admin table layout.
- Preserved cultivar data columns and edit/delete actions.
- Verification passed: `type-check`, `lint`, and `build`.

# OG detail table style

## Goal

Align `/og/:ogId` detail tables with the row-band table style used by
Discovery detail tables, OG index, and Admin.

## Scope

- `src/components/og-detail/OgCultivarCopyMap.tsx`
- `src/components/og-detail/OgIntersectionsSection.tsx`

## Steps

1. Add a small OG detail table style helper.
2. Apply row-band styling and stable widths to the cultivar copy map table.
3. Apply row-band styling and stable widths to the OG-SV intersections table.
4. Run frontend checks.

## Result

Completed.

- Added OG detail row-band table style helpers.
- Applied stable row-band styling to `Cultivar copy map`.
- Applied stable row-band styling to `OG × SV intersections`.
- Added minimum table widths and truncation for long cultivar, gene, and SV
  identifiers.
- Verification passed: `type-check`, `lint`, `check:arch`, and `build`.

# [PLAN] Align `/og` table row styling

## Goal

Make the `/og` orthogroup table visually consistent with the Discovery locus
matrix: soft row bands, lighter separators, and less harsh table grid styling.

## Scope

- Inspect `/og` table page and row component.
- Apply style changes only to the `/og` table surface.
- Keep existing sorting, filtering, pagination, and row behavior unchanged.

## Verification

- [x] `npm run type-check`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `git diff --check`

## Result

- Status: completed on 2026-04-26.
- Notes:
  - Updated `/og` table shell to use border-separated soft row bands.
  - Updated `OgIndexRow` cells with rounded first/last cells, light row borders,
    white band backgrounds, and subtle green hover state.
  - Preserved existing filters, sorting, pagination, row click behavior, and
    deep links.

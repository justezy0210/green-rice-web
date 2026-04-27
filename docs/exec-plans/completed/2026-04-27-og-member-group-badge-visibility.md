# OG member group badge visibility

Status: completed — 2026-04-27

## Goal

Make active-trait phenotype group badges visibly render in the unified
`Orthogroup members` table.

## Scope

- Render group badge space whenever `?trait=...` is active.
- Normalize cultivar keys for member, group, and PAV lookups.
- Avoid duplicate rows when Firestore cultivar names and member keys differ in
  case or separator style.

## Verification

- [x] `npm run lint`
- [x] `npm run type-check`
- [x] `npm run check:arch`
- [x] `git diff --check`
- [x] `curl -I http://localhost:5173/og/OG0041659?trait=culm_length`

## Result

- Group badge slot now renders whenever an active `?trait=...` context is
  present, even while grouping data is absent.
- Cultivar member, group, and PAV lookups now normalize keys to handle
  display-name vs lowercase-id differences.
- Duplicate member rows are suppressed using normalized cultivar keys.

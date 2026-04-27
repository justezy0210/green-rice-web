# OG member table unification

Status: completed — 2026-04-27

## Goal

Remove the duplicated `Cultivar copy map` table and make `Orthogroup members`
carry the trait-group and PAV-state context when available.

## Scope

- Add optional PAV state column to `Orthogroup members`.
- Keep phenotype group badges visible beside cultivar names when `?trait=...`
  is active.
- Use robust group lookup by cultivar id and display name.
- Remove `Cultivar copy map` from OG detail.

## Verification

- [x] `npm run lint`
- [x] `npm run type-check`
- [x] `npm run check:arch`
- [x] `git diff --check`
- [x] `curl -I http://localhost:5173/og/OG0041659?trait=culm_length`

## Result

- Unified `Cultivar copy map` into `Orthogroup members`.
- `Orthogroup members` now shows copy count, gene IDs, optional active-trait
  phenotype group badges, and PAV state in one table.
- Improved group lookup by checking both cultivar id and display name.
- Removed the separate `Cultivar copy map` render from OG detail.

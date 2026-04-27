# OG trait p-value sorting

Status: completed — 2026-04-27

## Goal

When `/og` is filtered by a specific trait, sort the OG rows by that trait's
p-value ascending instead of the default entity-first rarity sort.

## Scope

- Reuse the existing `trait_hits` index via `useTraitHits`.
- Apply p-value sorting only when `?trait=...` is active.
- Keep default rarity sorting when no trait filter is active.
- Update the sort hint copy.

## Verification

- [x] `npm run lint`
- [x] `npm run type-check`
- [x] `npm run check:arch`
- [x] `git diff --check`
- [x] `curl -I http://localhost:5173/og?preset=all&trait=heading_date`

## Result

- Status: completed
- `/og?trait=...` now sorts rows by that trait's p-value ascending, then falls back to rarity and OG id.
- The row p-value display follows the selected trait instead of showing the best p-value from any trait.

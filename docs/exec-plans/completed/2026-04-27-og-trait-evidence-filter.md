# OG trait evidence filter

Status: completed — 2026-04-27

## Goal

Add a phenotype/trait evidence overlay filter to `/og` without making trait
groups the primary OG classification.

## Scope

- Add URL-backed `/og?trait=...` filtering.
- Keep conservation/function/copy filters as primary OG axes.
- Add a compact `Trait evidence` chip row derived from OG index `traits`.
- Preserve `/pangenome` drilldown query links.

## Non-Goals

- Do not rename OG classes as phenotype PAV categories.
- Do not imply validated causal association.
- Do not change Discovery ranking logic.

## Verification

- [x] `npm run lint`
- [x] `npm run type-check`
- [x] `npm run check:arch`
- [x] `git diff --check`
- [x] `curl -I http://localhost:5173/og?trait=culm_length`

## Result

- Added a compact `Trait evidence` overlay filter to `/og`.
- Added URL-backed `/og?trait=...` filtering that composes with existing
  preset, category, and search filters.
- Moved preset and trait filter chips into small explore components to keep
  the route file within project size limits.

# Pangenome row drilldowns

Status: completed — 2026-04-27

## Goal

Make `/pangenome` rows work as entry points into the matching OG/SV subsets
instead of relying on generic "Browse OGs" and "Browse SVs" links.

## Scope

- Add URL-backed filters to `/og` for pangenome catalog presets and functional
  categories.
- Add URL-backed filters to `/sv` for SV type rows.
- Make `/pangenome` conservation, quick-count, functional, and SV rows link to
  their matching browse result sets.
- Preserve current page layout and cautionary copy.

## Verification

- [x] `npm run lint`
- [x] `npm run type-check`
- [x] `npm run check:arch`
- [x] `git diff --check`
- [x] `curl -I http://localhost:5173/pangenome`
- [x] `curl -I http://localhost:5173/og?preset=universal`
- [x] `curl -I http://localhost:5173/sv?type=DEL`

## Result

- Added URL-backed `/og` presets for pangenome catalog classes, including
  variable, common, panel-absent, and multi-copy-like subsets.
- Added URL-backed `/og` functional category filtering.
- Added URL-backed `/sv?type=...` filtering.
- Made `/pangenome` conservation rows, quick-count rows, functional rows, and
  SV type rows link directly to the corresponding browse result set.

# Pangenome and SV database UI pass

Status: completed — 2026-04-27

## Goal

Make `/pangenome` and `/sv` read like a scientific database interface instead
of generated summary pages.

## Problems

- Too many standalone metric cards.
- Generic explanatory copy dominates above the data.
- Progress bars and repeated rounded panels make the pages feel decorative.
- `/sv` should feel like a browse table first, not a dashboard.

## Scope

- Rework `/pangenome` into compact dataset metadata plus plain tables:
  - dataset metadata strip
  - orthogroup catalog table
  - functional category table
  - SV release table
- Rework `/sv` into a table-first browse page:
  - compact header metadata
  - tighter filter toolbar
  - reduce card styling and decorative row boxes
- Preserve existing data sources, routes, and claims.

## Non-Goals

- No data model changes.
- No new claims about validation, causality, or marker readiness.
- No route or navigation restructuring.

## Verification

- [x] `npm run lint`
- [x] `npm run type-check`
- [x] `npm run check:arch`
- [x] `git diff --check`
- [x] `curl -I http://localhost:5173/pangenome`
- [x] `curl -I http://localhost:5173/sv`

## Result

- Reworked `/pangenome` from card/progress-bar layout to dataset metadata and
  catalog tables.
- Reworked `/sv` from dashboard-style cards to a table-first browse surface
  with a compact filter bar.
- Preserved current routes, data sources, and cautionary claim boundaries.

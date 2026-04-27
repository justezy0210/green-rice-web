# Pangenome summary and SV browse rollout

Status: completed — 2026-04-27

## Goal

Add the first public pangenome-catalog layer that users expect from a
pan-genome database, without expanding Discovery or adding unsupported
claims.

## Scope

Implement two Browse surfaces using existing promoted artifacts:

- `/pangenome`
  - panel coverage summary
  - orthogroup tier counts
  - copy/PAV-like catalog counts
  - functional category summary
  - SV release summary
- `/sv`
  - structural-variant event browse table
  - search by event / chromosome
  - type, chromosome, carrier-count, size filters
  - links into existing `/sv/:eventId`

## Non-Goals

- No validated PAV/deletion calls.
- No marker-ready language.
- No pan-GWAS claims.
- No external Korean-specific comparison.
- No true haplotype/selection claims.

## Approach

1. Reuse existing `useOgIndex`, `useOgCategories`, and SV matrix hooks.
2. Add small pure helpers for pangenome summary and SV browse row derivation.
3. Add pages and routes.
4. Add Browse/dashboard links.
5. Validate type-check, lint, architecture check, build, and public route smoke.

## Files to modify

- `src/App.tsx`
- `src/components/layout/Header.tsx`
- `src/components/dashboard/EntityCardsGrid.tsx`
- `src/pages/PangenomeSummaryPage.tsx`
- `src/pages/SvIndexPage.tsx`
- `src/lib/pangenome-summary.ts`
- `src/lib/sv-browse.ts`

## Risks / Open questions

- `/pangenome` currently derives the active OrthoFinder version the same way
  `/og` does, through the default trait diff document.
- `/sv` loads all chromosome SV bundles client-side; current release size is
  acceptable, but later larger releases may need a server-side index.

## Verification

- [x] `npm run type-check`
- [x] `npm run lint`
- [x] `npm run check:arch`
- [x] `npm run build`
- [x] `curl -I http://localhost:5173/pangenome`
- [x] `curl -I http://localhost:5173/sv`
- [x] `curl -I http://localhost:5173/sv/EV0016276`

## Result

- Added `/pangenome` as a panel-level pangenome catalog summary using existing
  orthogroup and SV release artifacts.
- Added `/sv` as a structural-variant browse table with search, filters,
  pagination, and links into existing SV detail pages.
- Added dashboard and Browse navigation entries for the new surfaces.
- Build passes; Vite still reports the existing large client chunk warning.

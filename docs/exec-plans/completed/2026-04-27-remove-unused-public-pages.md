# Remove unused public pages

Status: completed — 2026-04-27

## Goal

Remove heavy, unnecessary public pages that expose Discovery pipeline/debug
internals instead of user-facing database views.

## Scope

Keep public user-facing pages:

- Overview
- Cultivars and cultivar detail
- Genes and gene detail
- Orthogroups and OG detail
- Discovery main and locus detail
- SV detail
- Region view
- Downloads

Remove public Discovery pipeline/internal pages:

- Run overview
- Step phenotype / orthogroups / variants / intersections / candidates
- Candidate detail
- Block list/detail
- Unused legacy Explore page component

## Validation

- Type-check.
- Lint.
- Architecture check.
- Build.
- Whitespace diff check.
- Confirm representative public routes respond.

## Result

- Status: DONE
- Removed public Discovery pipeline/internal pages:
  - run overview
  - step phenotype / orthogroups / variants / intersections / candidates
  - candidate detail
  - block list/detail
  - legacy Explore page component
- Removed page-only Discovery/Explore components that were no longer referenced.
- Kept public user-facing routes for overview, cultivars, genes, OGs,
  Discovery main/locus detail, SV detail, region view, downloads, login, and
  admin.
- Validation passed:
  - `npm run type-check`
  - `npm run lint`
  - `git diff --check`
  - `npm run check:arch`
  - `npm run build`
  - representative dev routes returned `200 OK`

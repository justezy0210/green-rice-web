# About Page Assembly Map

## Goal

Add an About page that explains Green Rice DB for first-time users and includes
an evidence-limited world map of public `Oryza sativa` high-level assemblies
by BioSample country.

## Data Basis

- Source: NCBI Datasets v2 `genome/taxon/4530/dataset_report`.
- Snapshot: 2026-04-27.
- Filter: current `Oryza sativa` assemblies, paired GCA/GCF records deduplicated,
  `Complete Genome` and `Chromosome` assembly levels only.
- Country field: BioSample `geo_loc_name`.
- Caveat: country metadata can be missing or refer to sample origin rather than
  submitter country; this is not a complete global inventory.

## Plan

1. Add a small static data module for the NCBI snapshot and country coordinates.
2. Build an About page with:
   - project identity and current scope,
   - assembly-resource world map,
   - data-layer flow,
   - user workflows,
   - Discovery interpretation caveats.
3. Add `/about` route and header link.
4. Document the implementation result.
5. Run lint/type/build checks.

## Result

- Added `src/pages/AboutPage.tsx`.
- Added `src/lib/about-assembly-data.ts` with the NCBI snapshot used for the
  world bubble map.
- Added `/about` route and Header navigation link.
- Verified `npm run lint`, `npm run type-check`, `npm run check:arch`,
  `npm run build`, `git diff --check`, and `curl -I http://localhost:5173/about`.

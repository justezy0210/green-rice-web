# [PLAN] Implement canonical Discovery locus URLs

## Goal

Add canonical readable locus URLs:

```text
/discovery/locus/:locusSlug
```

while keeping exact run-scoped block URLs:

```text
/discovery/:runId/block/:blockId
```

## Scope

- Add slug utility for curated and coordinate-derived loci.
- Add `DiscoveryLocusPage`.
- Add route before `/discovery/:runId`.
- Update `/discovery` locus heatmap links to canonical locus URLs.
- Keep exact run-scoped block routes valid.

## Verification

- [x] `npm run type-check`
- [x] `npm run lint`
- [x] `npm run check:arch`
- [x] `npm run build`
- [x] `git diff --check`
- [x] grep confirms no `/analysis` route/link returns.

## Result

- Status: completed on 2026-04-26.
- Notes:
  - Added `src/lib/discovery-locus-slugs.ts` with curated slug mappings and
    coordinate-derived fallback slugs.
  - Added `/discovery/locus/:locusSlug` before `/discovery/:runId`.
  - Added `DiscoveryLocusPage` as a canonical locus detail surface that resolves
    representative runs/blocks client-side and renders the representative block
    evidence in locus context.
  - Updated `LocusTraitMatrix` links to canonical locus URLs.
  - Kept `/discovery/:runId/block/:blockId` valid as exact technical links.

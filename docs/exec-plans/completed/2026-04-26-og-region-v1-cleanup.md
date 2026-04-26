# [PLAN] OG region v1 legacy cleanup

## Goal
Remove dead frontend and script surfaces that still target the retired
versionless `og_region/` / `og_tubemap/` artifacts, while keeping the active
v2 pointer + graph/AF bundle path intact.

## Context
The current UI reads OG region data through `useOgRegionGraph`,
`useOgRegionAf`, and the pointer at `downloads/_og_region_manifest.json`.
`useOgRegion` still projects those v2 bundles into the existing `RegionData`
shape for current UI consumers, so that compatibility type is not removed in
this cleanup.

## Approach
1. Delete unused v1 frontend read entry points and orphan components.
2. Remove v1 fetch functions and re-exports from region/orthogroup services.
3. Remove v1 storage path helpers and the v1 live uploader script.
4. Update cross-language storage-path parity to cover the v2 region paths
   instead of retired v1 paths.

## Files to modify
- `src/lib/og-region-service.ts`
- `src/lib/orthogroup-service.ts`
- `src/lib/storage-paths.ts`
- `src/hooks/useOgTubeMap.ts`
- `src/components/og-detail/OgPavEvidenceCard.tsx`
- `src/lib/path-annotation-overlap.ts`
- `scripts/upload-og-region.ts`
- `scripts/check-cross-language-parity.ts`
- `scripts/_storage_paths.py`
- `functions-python/shared/storage_paths.py`
- `scripts/batch-region-extract.py`
- `src/types/orthogroup.ts`
- `src/types/og-region.ts`
- `src/types/og-region-v2.ts`
- `docs/references/data-pipelines.md`
- `docs/product-specs/idea.md`
- `docs/exec-plans/tech-debt.md`

## Risks / Open questions
- `RegionData` and `OgRegionManifest` types are still used as adapter output
  shapes. Removing or renaming them would touch UI semantics and is out of
  scope for this pass.
- Historical docs will still mention v1 paths as completed-plan context; this
  cleanup only changes live code and the current plan result.

## Verification
- [x] `npm run type-check`
- [x] `npm run check:cross-language`
- [x] `npm run check:arch`
- [x] `npm run lint`
- [x] `npm run check:py`

## Result
- Status: DONE
- Notes: Removed unused v1 read/upload surfaces and switched path parity to
  the active v2 pointer/graph/AF path family. Kept `RegionData` and
  `OgRegionManifest` as UI compatibility projection shapes.

# [PLAN] Design canonical Discovery locus URLs

## Goal

Design readable, canonical Discovery locus URLs that avoid exposing raw
`runId` + `blockId` in the primary user-facing path.

Current precise data URL:

```text
/discovery/:runId/block/:blockId
```

Desired human-facing locus URL:

```text
/discovery/locus/:locusSlug
```

This is a new canonical surface, not a compatibility alias for the old
`/analysis` namespace.

## Questions To Resolve

- What is the stable slug source for each locus?
- How does a slug resolve to one or more existing block docs?
- Which block should be used as the representative detail page?
- Should old `/discovery/:runId/block/:blockId` remain supported as a precise
  technical deep link?
- How do entity backlinks and the Discovery home choose between canonical
  locus URLs and run-scoped block URLs?

## Recommended Design

### Route shape

Add a new canonical locus route:

```text
/discovery/locus/:locusSlug
```

Keep the existing run-scoped route:

```text
/discovery/:runId/block/:blockId
```

The run-scoped route remains the precise data address. It is still useful for
versioned/debuggable links because Firestore is stored as
`analysis_runs/{runId}/blocks/{blockId}`. The new `/discovery/locus/*` route is
the primary user-facing route from the Discovery home.

Route order must put `/discovery/locus/:locusSlug` before
`/discovery/:runId`; otherwise React Router will treat `locus` as a `runId`.

### Slug policy

Create `src/lib/discovery-locus-slugs.ts` with one source of truth:

```ts
slugForDiscoveryBlockGroup(group): string
resolveDiscoveryLocusSlug(slug, groups): DiscoveryBlockGroup | null
```

Curated loci get explicit stable slugs:

```text
curated_shared_chr11_dev_block        -> chr11-21-25mb-development
curated_heading_shared_chr06          -> chr06-9-11mb-heading-culm
curated_blb_chr11_resistance_block    -> chr11-27-29mb-blb-resistance
```

Auto loci get coordinate-only slugs:

```text
bin_chr11_18000000_18999999 -> chr11-18-19mb
bin_chr04_7000000_7999999   -> chr04-7-8mb
```

Do not include `traitId`, `runId`, or `blockId` in the canonical slug unless a
future collision forces it. A locus URL should represent the grouped locus,
not one trait-specific block.

### Resolution model

First implementation can be frontend-only:

1. `DiscoveryLocusPage` loads representative discovery runs using
   `useAnalysisRuns`.
2. It filters to current representative runs via
   `selectRepresentativeDiscoveryRuns`.
3. It loads blocks for those runs with `useDiscoveryBlocks`.
4. It groups blocks with `groupDiscoveryBlocks`.
5. It resolves `:locusSlug` to a `DiscoveryBlockGroup`.
6. It picks `group.representative` for the detail panels and also passes
   `group.blocks` for trait coverage/matrix context.

This keeps Firestore unchanged and avoids adding a denormalized locus index
until the UI proves stable.

### Page composition

Add:

```text
src/pages/DiscoveryLocusPage.tsx
```

The page should look like a locus detail, not a run detail:

- title: display locus name + region
- subtitle: trait chips and candidate/intersection totals
- show a compact per-trait block heatmap or trait ribbon
- reuse existing block evidence panels using the representative block
- expose a small technical link to
  `/discovery/:runId/block/:blockId` for exact run-scoped inspection

Extract shared block detail body only if needed:

```text
src/components/discovery/DiscoveryBlockDetailContent.tsx
```

Do not duplicate the heavy detail layout if a small extraction keeps both pages
consistent.

### Link policy

Primary Discovery links should use canonical locus URLs:

- `/discovery` locus matrix row/open link
- future Discovery summary cards

Run-specific workflow links should keep run-scoped URLs:

- `/discovery/:runId/blocks`
- `/discovery/:runId/block/:blockId`
- candidate rows with `blockId`
- cross-trait compare rows where the point is "this exact trait block"

Entity pages can remain run-scoped in the first pass because they often point
to an entity observed in a specific block/run. Later, region-level panels can
use canonical locus URLs if they have enough grouped locus context.

### Non-goals

- No Firestore collection migration.
- No old `/analysis` alias.
- No rewrite of `runId` format.
- No backend slug index in the first implementation.
- No automatic redirect from every run-scoped block URL to a locus URL; keep
  run-scoped URLs valid as exact technical addresses.

## Implementation Phases

### Phase 1: canonical route and home links

- Add slug utility.
- Add `/discovery/locus/:locusSlug` route before `/discovery/:runId`.
- Add `DiscoveryLocusPage`.
- Update `LocusTraitMatrix` links to `/discovery/locus/:locusSlug`.
- Keep existing run-scoped block detail route working.

### Phase 2: detail-page extraction

- Extract shared detail content if the new locus page duplicates too much of
  `DiscoveryBlockDetailPage`.
- Adjust breadcrumb copy from "Run overview" to "Discovery".
- Add exact technical link to the representative block.

### Phase 3: broader link cleanup

- Review entity/region/cross-trait links and switch only the links that are
  semantically locus-level.
- Leave exact run/block links where the user is inspecting a particular
  candidate, block, or trait-run context.

## Verification

- Design only for this pass; no code verification required unless
  implementation is explicitly started.

## Result

- Status: completed on 2026-04-26.
- Notes:
  - Recommended `/discovery/locus/:locusSlug` as the new canonical
    user-facing locus route.
  - Kept `/discovery/:runId/block/:blockId` as a valid precise technical route
    because it maps directly to `analysis_runs/{runId}/blocks/{blockId}`.
  - Defined curated and auto slug policies.
  - Defined frontend-only first implementation using existing representative
    run filtering, block loading, and block grouping.
  - Noted route ordering requirement: `/discovery/locus/:locusSlug` must be
    declared before `/discovery/:runId`.

# Discovery locus lead triage

## Goal

Reframe `/discovery/locus/:locusSlug` around what a database visitor is
likely trying to decide: whether this candidate locus is worth inspecting
further, which OG/gene/SV to inspect first, and where to go next.

## Scope

- `src/pages/DiscoveryLocusPage.tsx`
- locus detail components under `src/components/discovery/`

## Steps

1. Replace the top summary with a lead-focused summary: locus, connected
   traits, first OG/gene/SV/region to inspect, and why it is flagged.
2. Move priority candidate leads before trait comparison.
3. Keep trait comparison, caveats, source notes, exact block link, and export
   as supporting material.
4. Remove representative block evidence from the primary flow.
5. Run frontend checks.

## Result

Completed.

- Reframed the locus page as a candidate lead triage surface.
- Top summary now answers what to inspect first: OG, gene, SV, and region.
- Priority leads appear before trait comparison and link directly to OG,
  gene, candidate, source block, and region surfaces.
- Representative block evidence was removed from the primary flow; source
  block and export remain available as supporting material.
- Added a locus-specific caveat strip.
- Verification passed: `type-check`, `lint`, `check:arch`, and `build`.

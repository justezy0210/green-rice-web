# Discovery review candidate refocus

Status: completed — 2026-04-27

## Goal

Refocus Discovery main and locus detail pages on what a database user wants to
review: trait-group-consistent SV patterns, related OG/gene candidates, and why
the locus is worth inspecting. Raw OG/SV inventory counts should remain
supporting context, not the main result.

## Implementation

1. Added a reusable locus review summary helper built from existing prioritized
   SV pattern logic.
2. Changed the Discovery main list from raw-count columns to review-candidate
   columns: traits, prioritized SV count, strongest SV pattern, related
   OG/gene, review type.
3. Moved raw OG/SV inventory counts into small secondary text.
4. Changed the detail evidence section label/copy so it reads as supporting
   trait evidence, not the primary result.
5. Moved prioritized SV patterns above supporting trait evidence in the detail
   page.
6. Kept all wording in review-candidate language, not causal or statistically
   significant language.

## Validation

- `npm run type-check`
- `npm run lint`
- `npm run check:arch`
- `npm run build`
- `git diff --check`
- `curl -I http://localhost:5173/discovery`
- `curl -I http://localhost:5173/discovery/locus/chr11-21-25mb-development`

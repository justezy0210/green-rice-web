# Remove internal evidence panels

Status: completed — 2026-04-27

## Goal

Remove public-page panels that expose internal analysis/debug evidence rather
than answering the entity-centered database questions users arrive with.

## Context

The OG detail page still shows `Anchor-locus variants` and
`Observed in discovery`. Both are confusing in the current simplified public
flow:

- `Anchor-locus variants` is locus-local advanced evidence, not an OG-level
  answer.
- `Observed in discovery` repeats internal run/candidate rows after the public
  run/candidate pages were removed.

## Approach

1. Remove both panels from OG detail.
2. Remove the same `Observed in discovery` panel from SV detail if present.
3. Delete now-unused component/hooks/helper files if they are no longer
   referenced.
4. Audit remaining public pages for similar internal-analysis wording or links.
5. Validate with type-check, lint, architecture check, build, and route checks.

## Files to modify

- `src/pages/OgDetailPage.tsx`
- `src/components/sv/SvLinkedContext.tsx`
- related now-unused components/hooks/libs after reference audit

## Risks / Open questions

- Do not remove user-facing Discovery locus links; those are still useful.
- Do not remove OG copy/PAV or OG x SV intersection information unless it is
  only internal/debug metadata.

## Verification

- [x] `npm run type-check`
- [x] `npm run lint`
- [x] `npm run check:arch`
- [x] `npm run build`
- [x] Representative public routes respond

## Result

- Status: DONE
- Removed `Anchor-locus variants` from OG detail.
- Removed `Observed in discovery` from OG and SV detail contexts.
- Removed the internal `Active run` OG card.
- Removed now-unused UI components for those panels.
- Removed raw inventory / OG-SV count wording from Discovery public tables.
- Removed block id and candidate/intersection count details from region
  review-locus tooltips and lists.
- Kept user-facing evidence:
  - OG copy/PAV map
  - OG x SV intersections
  - Discovery review locus links
  - SV cultivar and trait-group pattern views

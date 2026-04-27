# Discovery hide zero-review loci

Status: completed — 2026-04-27

## Goal

Do not show loci with zero prioritized SV review candidates in the primary
Discovery table. Rows with no review SVs and no strongest pattern are raw
inventory, not useful primary candidates.

## Implementation

1. Waited for SV group-frequency summaries before rendering the primary review
   locus table.
2. Filtered the main Discovery table to loci with at least one prioritized SV
   pattern.
3. Added a clear empty state if no loci pass the review-candidate threshold.

## Validation

- `npm run type-check`
- `npm run lint`
- `npm run check:arch`
- `npm run build`
- `git diff --check`
- `curl -I http://localhost:5173/discovery`

# Discovery main candidate-backed summary

Status: completed — 2026-04-27

## Goal

Fix the Discovery main page becoming empty after filtering zero-review loci.
The main summary should use the same candidate-level evidence that the detail
page uses, not only the block-level `leadSvs` summary.

## Implementation

1. Loaded candidate records for the blocks shown on Discovery main.
2. Built review summaries from candidates plus block summaries.
3. Kept zero-priority rows out of the primary review table when true candidate
   summaries exist.
4. If no locus passes the current priority threshold, show a non-empty fallback
   list of candidate loci with clear "below threshold" language.

## Validation

- `npm run type-check`
- `npm run lint`
- `npm run check:arch`
- `npm run build`
- `git diff --check`
- `curl -I http://localhost:5173/discovery`

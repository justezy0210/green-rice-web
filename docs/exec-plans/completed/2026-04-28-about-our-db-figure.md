# About Our DB Figure

## Goal

Replace the current `Our DB` figure because the genome-bar plot is too generic
and does not clearly explain what Green Rice DB connects.

## Result

- Replaced the first About figure with a data-layer-to-review-output diagram.
- Removed the previous cultivar genome-bar plot.
- The new figure shows connected input layers, the Green Rice DB review frame,
  and review outputs for cultivar diversity and candidate gene/SV evidence.
- Preserved the approved banner layout, scroll snap, reveal behavior, and copy.

## Verification

- `npm run lint`
- `npm run type-check`
- `npm run build`
- `git diff --check`
- `curl -I http://localhost:5173/about`

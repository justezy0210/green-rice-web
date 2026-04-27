# OG impact label fit

Status: completed — 2026-04-27

## Goal

Fix clipped impact labels in the OG detail `OG × SV intersections` table.

## Implementation

1. Increased the Impact column width enough for the primary impact labels.
2. Allowed the impact badge to wrap within the cell instead of clipping.
3. Kept the change scoped to OG detail table rendering.

## Validation

- `npm run type-check`
- `npm run lint`
- `npm run check:arch`
- `npm run build`
- `git diff --check`
- `curl -I 'http://localhost:5173/og/OG0044616?trait=culm_length'`

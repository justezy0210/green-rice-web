# Discovery priority locus row click

Status: completed — 2026-04-27

## Goal

Make `Priority review loci` on `/discovery` navigate to the locus detail when a
user selects the table row, and remove the separate `Open` action column.

## Implementation

Completed:

1. Removed the `Open` column from the priority locus table.
2. Made each table row act as a keyboard-accessible link to
   `/discovery/locus/{slug}`.
3. Kept row hover styling clear so the clickable affordance remains visible.

## Validation

- `npm run type-check` passed.
- `npm run lint` passed.
- `npm run check:arch` passed.
- `git diff --check` passed.
- `npm run build` passed with the existing Vite chunk-size warning.
- `curl -I http://localhost:5173/discovery` returned 200.


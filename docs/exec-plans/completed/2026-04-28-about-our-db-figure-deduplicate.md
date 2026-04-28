# About Our DB Figure Deduplication

## Goal

Remove overlap between the `Our DB` figure and the `Data Scope` banner. The
first figure should explain the database identity, not list data layers or
counts.

## Result

- Replaced the data-layer list figure with a "not only static metadata vs
  connected pangenome review database" figure.
- Removed exact counts from the first figure so the Data Scope banner owns
  all scope/count information.
- Preserved the approved layout, scroll snap, reveal behavior, and copy.

## Verification

- `npm run lint`
- `npm run type-check`
- `npm run build`
- `git diff --check`
- `curl -I http://localhost:5173/about`

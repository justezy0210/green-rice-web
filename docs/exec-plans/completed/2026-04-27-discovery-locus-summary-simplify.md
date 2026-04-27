# Discovery locus summary simplify

Status: completed — 2026-04-27

## Goal

Reduce duplication in the Discovery locus summary panel. The panel should act
as a page header, not a second evidence summary.

## Implementation

1. Removed duplicated metric boxes from the locus summary card.
2. Removed raw inventory counts from the summary card.
3. Kept only locus identity, region, curation status, trait context chips, and
   one short instruction pointing users to prioritized SV patterns.
4. Left raw inventory explanation to the evidence matrix section.

## Validation

- `npm run type-check`
- `npm run lint`
- `npm run check:arch`
- `npm run build`
- `git diff --check`
- `curl -I http://localhost:5173/discovery/locus/chr11-21-25mb-development`

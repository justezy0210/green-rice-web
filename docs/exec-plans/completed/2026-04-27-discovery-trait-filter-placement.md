# Discovery trait filter placement

Status: completed — 2026-04-27

## Goal

Make trait filtering easy on Discovery locus detail pages after moving
`Supporting trait evidence` below the prioritized SV patterns. Users should be
able to filter the SV review section before reading the supporting evidence
table.

## Implementation

1. Added a compact trait filter bar above `Prioritized SV patterns`.
2. Kept the existing supporting evidence rows clickable as a secondary filter
   control.
3. Removed filter-instruction copy from the lower supporting evidence section.

## Validation

- `npm run type-check`
- `npm run lint`
- `npm run check:arch`
- `npm run build`
- `git diff --check`
- `curl -I http://localhost:5173/discovery/locus/chr11-21-25mb-development`

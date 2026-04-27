# Discovery simplify review counts

Status: completed — 2026-04-27

## Goal

Simplify user-facing count labels in Discovery. The current wording around
review candidates, unique SVs, attached signals, and trait-SV signals is too
technical.

## Implementation

1. Made distinct SV count the primary number.
2. Moved trait-link counts into smaller supporting text.
3. Used "SVs to review" and "trait links" wording instead of "review
   candidates" and "attached signals".
4. Applied the simpler wording to both Discovery main and locus detail.

## Validation

- `npm run type-check`
- `npm run lint`
- `npm run check:arch`
- `npm run build`
- `git diff --check`
- `curl -I http://localhost:5173/discovery`
- `curl -I http://localhost:5173/discovery/locus/chr11-21-25mb-development`

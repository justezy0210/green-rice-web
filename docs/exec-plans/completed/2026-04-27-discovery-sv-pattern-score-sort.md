# Discovery SV pattern score sort

Status: completed — 2026-04-27

## Goal

Sort `SV patterns across groups` by the impact-weighted SV score instead of raw
group-frequency gap alone.

## Score

Mirrors the raw-analysis score:

```text
score = group ALT-frequency gap * primary impact weight
```

The frontend computes this from the displayed group frequencies and the row's
primary `impactClass`, so the review order matches the current Discovery
evidence policy.

## Implementation

Completed:

1. Added a shared frontend helper for impact class weight and score calculation.
2. Added `score` to `SvPatternRow`.
3. Sorted rows by `score`, then raw group gap, then `absDeltaAf`, then stable IDs.
4. Updated the section copy and row display so users can see the score basis.

## Validation

- `npm run type-check` passed.
- `npm run lint` passed.
- `npm run check:arch` passed.
- `git diff --check` passed.
- `npm run build` passed with the existing Vite chunk-size warning.
- `curl -I http://localhost:5173/discovery/locus/chr11-21-25mb-development`
  returned 200.


# Discovery locus metric labels

Status: completed — 2026-04-27

## Goal

Make the `/discovery` priority-locus metrics understandable without internal
pipeline terminology.

## Changes

Completed:

1. Renamed `OGs` to `Candidate OGs`.
2. Renamed `Intersections` to `OG-SV links`.
3. Added short header tooltips explaining both metrics.
4. Widened metric columns so the labels fit better.

## Validation

- `npm run type-check` passed.
- `npm run lint` passed.
- `npm run check:arch` passed.
- `git diff --check` passed.
- `npm run build` passed with the existing Vite chunk-size warning.
- `curl -I http://localhost:5173/discovery` returned 200.


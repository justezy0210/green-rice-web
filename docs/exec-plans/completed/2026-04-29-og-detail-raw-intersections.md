# OG Detail Raw Intersections

## Goal

Remove the raw `OG x SV intersections` panel from OG detail pages because it
can show sample-coordinate overlap rows where the displayed cultivar is REF
for the SV. This makes the panel look like carrier evidence when it is only a
raw overlap artifact.

## Scope

- Stopped rendering `OgIntersectionsSection` on `/og/:ogId`.
- Kept the underlying data artifacts and services unchanged for now; future
  carrier-aware SV evidence can reuse or replace them.

## Result

- `OG0001566` no longer shows the misleading raw intersections panel where
  `namil_g12509.t1` appeared for `EV0003295` and `EV0003296` even though
  Namil has genotype `0` for both SVs.
- OG detail now stays centered on orthogroup members, copy pattern, trait-hit
  chips, optional lead SV context, and observed discovery blocks.

## Verification

- `npm run type-check`
- `npm run lint`
- `npm run build`

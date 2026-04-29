# OG Intersection Gene Link SV Context

Date: 2026-04-29

## Problem

The OG detail `OG x SV intersections` table linked overlapped genes with
`?sv={eventId}`. That implied the listed gene-model cultivar carried the ALT
allele for the SV.

For rows such as `OG0000297 / EV0017077`, the intersected gene model is
Pyeongwon, but Pyeongwon is genotype `0` for the event. Opening
`/genes/pyeongwon_g43837.t1?sv=EV0017077` therefore correctly showed no ALT
overlay, but the navigation was misleading.

## Change

- Keep the SV event ID linked to `/sv/{eventId}` for carrier/genotype review.
- Change the gene link to `/genes/{geneId}` without the SV query parameter.
- Rename the table headers from `Cultivar` / `Gene` to `Gene model` /
  `Overlapped gene` to avoid presenting the gene-model cultivar as an ALT
  carrier.

## Verification

- `npm run type-check`
- `npm run build`
- `git diff --check`

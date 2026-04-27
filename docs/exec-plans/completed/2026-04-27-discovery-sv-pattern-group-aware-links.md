# Discovery SV pattern group-aware links

## Goal

Make `SV patterns across groups` answer which phenotype group and cultivar
carry each SV signal.

## Problems

- Region links often open the reference cultivar, which may not show the
  cultivar-specific change the user wants to inspect.
- Cultivar genotype tiles show ALT/REF but not the phenotype group label
  (`tall`, `short`, `early`, `late`, etc.).
- A DEL/INS/COMPLEX event does not currently state which trait group has higher
  ALT carrier frequency.

## Decision

- Prefer an ALT-carrying, non-reference cultivar from the group with the highest
  ALT carrier frequency when building the region link.
- Add trait group tags to genotype tiles.
- Add an enrichment summary such as `DEL ALT enriched in tall (8/8 vs short
  0/3)`. This is a carrier-frequency description, not a causal claim.

## Verification

- `npm run type-check`
- `npm run lint`
- `npm run check:arch`
- `npm run build`
- `git diff --check`

## Result

- Added a trait grouping helper backed by `data/analysis_groupings_v4.json`.
- Cultivar genotype tiles now show trait group labels such as `tall`, `short`,
  `early`, or `late`.
- SV pattern panels now summarize the group direction, e.g.
  `DEL ALT enriched in tall (tall 8/8 vs short 0/3)`.
- Region links now prefer an ALT-carrying non-reference cultivar from the group
  with the highest ALT carrier frequency.
- Region links include the selected cultivar and group label in the visible
  link text.

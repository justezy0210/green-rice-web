# Carrier-Safe SV Links

## Goal

Check all user-facing pages for links that imply a cultivar/gene carries an SV
when the source data may only be a raw overlap row. Remove or gate links that
can send users from an OG/gene context to an SV where that cultivar is actually
REF.

## Findings

- OG detail raw `OG x SV intersections` panel could show an overlapped gene
  from a cultivar that is REF for the linked SV.
- OG detail `Lead SV evidence` used `candidate.bestSv.cultivar` and
  `candidate.bestSv.geneId`, which are built from raw step5 overlap fields.
  Example: `OG0001566?trait=panicle_length` pointed to
  `namil_g12509.t1?sv=EV0003295`, while Namil is REF for `EV0003295`.
- Discovery SV pattern region links already choose an ALT-carrier cultivar
  from genotype data before opening a region page.
- SV detail region links already choose the first ALT carrier from genotype
  data.
- Region and gene detail overlays only draw cultivar-carried SVs in
  cultivar-scoped mode.

## Changes

- Deleted the unused raw `OgIntersectionsSection` UI.
- Removed raw cultivar/gene/impact/region drilldowns from the OG lead SV card.
- Kept only the SV detail link from OG lead SV cards, because SV detail is
  genotype-aware and shows the true carrier pattern.

## Verification

- `npm run type-check`
- `npm run lint`
- `npm run build`
- `npm run check:arch`
- `git diff --check`

# Discovery detail user-question flow

## Goal

Make the Discovery locus detail page answer user questions instead of exposing
pipeline artifacts as the main content.

The page should answer, in order:

- Why is this locus worth reviewing?
- Which traits point to it?
- Do SV carrier patterns differ by trait group and cultivar?
- What should the user inspect next?
- Where is the raw source data if needed?

## Problem

The current locus detail still exposes too many analysis-internal concepts:

- candidate evidence units
- review score / best rank
- source rows
- repeated candidate/source links
- gene links that can imply stronger evidence than the page supports

These are useful for provenance, but they should not dominate the user-facing
detail view.

## Product Rule

Primary locus detail links should be limited to:

- OG detail
- SV detail
- Region viewer

Gene links should appear only where there is a specific gene-page reason.
Candidate row, source block, and gene links should not appear on the locus
detail page. Source data should remain collapsed and limited to curator notes
and downloads.

## Implementation Tasks

- Remove follow-up handle links from the locus summary card.
- Keep trait support table non-navigational.
- Replace `Candidate evidence units` with a smaller `Inspect next` section.
- Remove gene and candidate/source links from the primary inspection surface.
- Keep SV carrier pattern as the central visual evidence section.
- Keep curator notes/export under collapsed Source data.

## Verification

- `npm run type-check`
- `npm run lint`
- `npm run check:arch`
- `npm run build`
- `git diff --check`
- Smoke check `/discovery/locus/chr11-21-25mb-development`

## Result

- Locus summary no longer exposes lead OG/gene/SV/source-block handle links.
- Trait evidence is now non-navigational context rather than a link table.
- SV carrier pattern remains the central review section.
- The old candidate evidence table was replaced with a compact `Inspect next`
  section limited to OG, SV, and Region links.
- Candidate row, gene, and exact source-block navigation links were removed
  from the locus detail page.
- The unused legacy candidate/priority-lead components were removed so the old
  link-heavy detail surface cannot be reintroduced accidentally.
- Source data remains collapsed and contains curator notes plus export
  downloads.

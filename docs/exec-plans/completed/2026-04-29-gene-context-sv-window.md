# Gene Context SV Window

Date: 2026-04-29

## Goal

Make gene detail SV visualization match the evidence users expect from
Discovery: not only transcript-body SVs, but also nearby primary impact
contexts such as promoter, upstream, and downstream regions.

## Plan

1. Use a gene-centered display window:
   - promoter 2 kb
   - upstream 2-10 kb
   - gene body, including CDS, UTR, intron, and splice context
   - downstream 2 kb
2. Keep SV rendering in the cultivar sample frame, using per-cultivar SV
   coordinate side-tables.
3. Classify rendered SVs by primary impact context and show that context in
   tooltips.
4. Highlight the linked SV when a gene page is opened with `?sv={eventId}`.

## Changes

- Added `src/lib/gene-context-window.ts` for strand-aware context window and
  impact classification.
- Extended `GeneModelSvg` to render a wider context window with promoter,
  upstream, gene-body, and downstream bands.
- Changed gene detail SV filtering from gene-body overlap to primary-impact
  window overlap.
- Updated linked-SV copy to explain whether the linked SV falls inside the
  gene-centered view.

## Verification

- `npm run type-check`
- `npm run build`
- `git diff --check`

# Discovery locus SV pattern surface

## Goal

Make `/discovery/locus/:locusSlug` answer the visitor's next question:
which OG/gene/SV should I inspect, and does the lead SV pattern differ across
the trait-defined cultivar groups?

## Scope

- Aggregate locus candidates by primary OG so the page presents a small set of
  actionable leads instead of a raw candidate row list.
- Add a locus-level SV pattern section using existing SV trait group frequency
  artifacts.
- Keep exact candidate, OG, gene, source block, and region links reachable.
- Keep trait comparison and export sections as supporting context.

## Implementation Plan

1. Add a lib helper that builds sorted OG-centered locus leads from candidates.
2. Add a hook that fetches SV group frequency bundles for every trait in the
   locus.
3. Add a lead review component that shows top OG leads, lead genes, lead SVs,
   score/rank context, and links.
4. Add an SV pattern component with per-group ALT frequency bars for lead SVs.
5. Reorder `DiscoveryLocusPage` so the primary flow is summary -> top leads ->
   SV pattern -> trait comparison -> supporting notes/export.
6. Run `type-check`, `lint`, `check:arch`, and `build`.

## Result

Completed on 2026-04-26.

- Added OG-centered locus lead aggregation.
- Replaced the raw priority table surface with top review lead panels.
- Added a lead SV group-frequency visualization and cultivar genotype strip.
- Reordered the locus page around visitor questions: what to inspect first,
  whether lead SVs differ by group, then trait/source context.
- Verification passed: `type-check`, `lint`, `check:arch`, `build`, and
  `git diff --check`.

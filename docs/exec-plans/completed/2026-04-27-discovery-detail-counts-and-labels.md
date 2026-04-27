# Discovery detail counts and labels

## Goal

Make the Discovery locus detail page explain its own numbers and sections.

The page currently exposes useful values without enough context:

- `candidate OG observations`
- `OG-SV overlaps`
- `Trait evidence at this locus`
- `showing 8 of 304`
- `Inspect next`

These are pipeline-derived values. A database user needs to know what question
each section answers before they can trust the page.

## User Questions To Answer

- Why did this locus appear on the Discovery page?
- What do the OG and overlap counts mean?
- Which trait analyses pointed to this same genomic window?
- Why are only some SV events shown first?
- What are the outgoing links for?

## Implementation Tasks

- Add a compact count explanation to the locus summary.
- Rename `Trait evidence at this locus` to a user-question-oriented heading.
- Clarify that the trait table lists trait analyses supporting the same window.
- Rename `SV carrier pattern by group` to focus on cultivar/group comparison.
- Explain that the displayed SV rows are sorted by group-frequency difference.
- Add an explicit show-more/show-less control for the SV rows.
- Rename `Inspect next` to a clearer related-records section.

## Verification

- `npm run type-check`
- `npm run lint`
- `npm run check:arch`
- `npm run build`
- `git diff --check`
- Smoke check `/discovery/locus/chr11-21-25mb-development`

## Result

- The locus summary now explains `Trait analyses`, `OG observations`, and
  `OG-SV overlaps` as discovery inventory counts.
- `Trait evidence at this locus` was renamed to `Why this locus is listed`.
- `SV carrier pattern by group` was renamed to `SV patterns across groups`.
- The SV section now says that rows are trait-SV signals sorted by ALT
  carrier-frequency gap.
- The `showing 8 of 304` label now reads as `showing 8 of 304 signals`, with
  unique SV count shown when different from the signal count.
- The SV section now has an explicit `Show all ... signals` / `Show first 8`
  control.
- `Inspect next` was renamed to `Related database records`.

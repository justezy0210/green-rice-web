# Discovery locus trait filter

## Goal

Let users select a trait comparison in `Why this locus is listed` and narrow
the downstream locus detail sections to that trait.

## Behavior

- No selected trait: show all locus blocks/candidates.
- Selected trait: `SV patterns across groups` and `Related database records`
  show only rows/candidates for that trait.
- Clicking the selected trait again clears the filter.
- The table visually marks the selected trait row.

## Implementation Tasks

- Add selected-trait state to `DiscoveryLocusPage`.
- Derive filtered blocks and candidates from that state.
- Pass selected trait state and handler to `LocusEvidenceMatrix`.
- Make the trait label in `LocusEvidenceMatrix` a filter toggle.
- Pass filtered blocks/candidates to `SvPatternByGroup` and `LocusInspectNext`.

## Verification

- `npm run type-check`
- `npm run lint`
- `npm run check:arch`
- `npm run build`
- `git diff --check`

## Result

- Added page-level selected-trait state to the Discovery locus detail page.
- `Why this locus is listed` trait labels now act as filter toggles.
- The selected trait row is highlighted and marked `filter active`.
- `SV patterns across groups` receives only blocks/candidates for the selected
  trait.
- `Related database records` receives only candidates for the selected trait.
- Users can clear the filter from the table row or the `Clear trait filter`
  button.

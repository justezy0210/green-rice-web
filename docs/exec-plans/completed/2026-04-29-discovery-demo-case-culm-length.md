# Discovery Demo Case: Culm Length

## Goal

Replace the Discovery demo case from the chr06 heading-date block to a stronger
culm-length example where both OG presence and SV carrier pattern split cleanly
by phenotype group.

## Representative Case

- Trait: `culm_length`
- Discovery locus: shared chr11 development locus
- OG: `OG0039795`
- SV: `EV0016290`
- OG presence: tall 100%, short 0%
- SV carrier: tall 8/8 ALT, short 0/3 ALT

## Changes

- Updated the guide widget Discovery scenario.
- Updated the Korean guide-purpose document.
- Updated the English demo-scenarios presentation document.
- Kept the separate SV-browser scenario unchanged; it is still a browser/filter
  example, while this new case is the Discovery review-locus example.

## Verification

- `npm run type-check`
- `npm run lint`
- `npm run build`
- `git diff --check`

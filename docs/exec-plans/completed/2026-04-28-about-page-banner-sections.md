# About Page Banner Sections

## Goal

Reintroduce `/about` as a concise explanatory page made of stacked concept
sections. The page should explain the Green Rice DB purpose, assembly-based
pangenome background, current 11-cultivar data scope, entity-centered browsing,
and the three core review workflows.

## Result

- Added `src/pages/AboutPage.tsx`.
- Restored the `/about` route in `src/App.tsx`.
- Restored the Header navigation item for About.
- Kept the current release wording scoped to 11 Korean rice cultivars.
- Kept Discovery wording conservative: hypothesis-generating candidate review,
  not validated causal variants or marker-ready results.
- Did not re-add the origin map figure to the page.

## Verification

- `npm run lint`
- `npm run type-check`
- `npm run check:arch`
- `npm run build`
- `git diff --check`
- `curl -I http://localhost:5173/about`

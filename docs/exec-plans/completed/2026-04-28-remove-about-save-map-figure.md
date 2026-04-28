# Remove About Page Save Map Figure

## Goal

Remove the temporary About page from the public app and preserve the
deduplicated rice pangenome origin map as a standalone figure file for later
presentation or documentation use.

## Plan

1. Save the current country-count map as an SVG figure under
   `docs/presentation/figures/`.
2. Remove the `/about` route and the About navigation link.
3. Delete About-only source files that are no longer referenced.
4. Run lint, type-check, architecture check, build, and diff whitespace check.

## Result

- Added `docs/presentation/figures/rice-pangenome-origin-map.svg`.
- Removed the `/about` route from `src/App.tsx`.
- Removed the About navigation item from `src/components/layout/Header.tsx`.
- Deleted the temporary About page, About resource component, and About data
  module from `src/`.

## Verification

- `npm run lint`
- `npm run type-check`
- `npm run check:arch`
- `npm run build`
- `git diff --check`
- Confirmed no `AboutPage`, `/about`, `About Green Rice`, or map-title strings
  remain in `src` or production build assets.

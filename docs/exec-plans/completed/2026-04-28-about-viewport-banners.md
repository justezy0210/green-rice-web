# About Viewport Banners

## Goal

Adjust `/about` so each conceptual banner reads as a full viewport section
instead of a compact stacked card. Each section should occupy roughly one view
height while still allowing overflow when content needs more room on small
screens.

## Result

- Updated the shared About `ConceptSection` wrapper to use viewport-height
  banners with centered content.
- Increased section spacing and title scale so each concept reads as a separate
  screen.
- Kept the current 11-cultivar scope and conservative Discovery framing.
- Changed the data-scope table wrapper to allow horizontal scrolling on narrow
  screens.

## Verification

- `npm run lint`
- `npm run type-check`
- `npm run check:arch`
- `npm run build`
- `git diff --check`
- `curl -I http://localhost:5173/about`

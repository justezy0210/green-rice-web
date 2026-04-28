# About Mobile Layout

## Goal

Fix `/about` mobile rendering. The desktop banner layout should remain, but
mobile must not inherit desktop-only scroll snap, forced viewport height, or
wide figure grids that break the layout.

## Result

- Restricted page-level scroll snap to desktop viewports.
- Disabled reveal transitions on mobile so banners stay visible during natural
  scrolling.
- Removed forced viewport-height panels on mobile and reduced mobile spacing and
  type scale.
- Made figure internals stack cleanly on narrow screens.
- Added a mobile card-list version of Data Scope instead of forcing a wide table
  on small screens.
- Preserved the desktop banner layout, snap behavior, and reveal behavior.

## Verification

- `npm run lint`
- `npm run type-check`
- `npm run check:arch`
- `npm run build`
- `git diff --check`
- `curl -I http://localhost:5173/about`

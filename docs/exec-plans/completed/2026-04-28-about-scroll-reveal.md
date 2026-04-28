# About Scroll Reveal

## Goal

Add a subtle scroll reveal effect to `/about` banners. Banners should fade and
shift slightly when leaving the viewport center, then become fully visible again
when snapped into the center.

## Result

- Added an IntersectionObserver-based visibility hook inside `AboutPage`.
- Applied opacity, vertical translation, and slight scale transitions to each
  banner panel.
- Preserved the existing banner size, rounded panel layout, and scroll snap
  behavior.
- Kept reduced-motion users on the non-animated visible state.

## Verification

- `npm run lint`
- `npm run type-check`
- `npm run build`
- `git diff --check`
- `curl -I http://localhost:5173/about`

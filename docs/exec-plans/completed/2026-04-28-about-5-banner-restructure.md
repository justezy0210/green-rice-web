# About 5-Banner Restructure

## Goal

Restructure `/about` around the user's five requested content sections while
preserving the approved banner layout, size, scroll snap, and reveal behavior.

## Result

- Reworked `src/pages/AboutPage.tsx` into five banners:
  - Our DB
  - Background
  - Project Objective
  - Data Scope
  - Entity-Centered Information Architecture
- Kept the UI copy in English and translated the user's Korean source text into
  the page copy.
- Added and rearranged figures in `src/components/about/AboutFigures.tsx` so
  each banner has a supporting visual.
- Updated the data scope table to show the user-specified annotation counts:
  `513,658 annotation rows / 507,926 gene-index entries`.
- Preserved the existing rounded banner layout, scroll snap, and reveal effect.

## Verification

- `npm run lint`
- `npm run type-check`
- `npm run check:arch`
- `npm run build`
- `git diff --check`
- `curl -I http://localhost:5173/about`

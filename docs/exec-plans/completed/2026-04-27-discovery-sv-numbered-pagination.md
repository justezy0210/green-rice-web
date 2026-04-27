# Discovery SV numbered pagination

## Goal

Add page numbers to the Discovery locus SV pattern pagination.

## Problem

Previous/Next controls are a pager, not a complete pagination control. With
hundreds of signals, users need to know where they are and jump across pages.

## Implementation Tasks

- Add numbered page buttons around the current page.
- Always expose first and last page when there are many pages.
- Use ellipsis markers for skipped ranges.
- Keep Previous/Next controls and disabled states.

## Verification

- `npm run type-check`
- `npm run lint`
- `npm run check:arch`
- `npm run build`
- `git diff --check`

## Result

- Added a reusable `NumberedPagination` component.
- SV pattern pagination now shows `Previous`, numbered pages, ellipses, and
  `Next`.
- First and last pages remain visible when the page range is collapsed.
- Pagination helpers were split out so `SvPatternByGroup` stays under the
  architecture file-size warning threshold.

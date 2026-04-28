# About Map Caption Simplify

## Goal

Simplify the About page pangenome-origin map so the section shows the map and
country counts directly, with source/method details moved into a small caption.

## Plan

1. Remove the prominent explanatory text and metric/source panels from the map
   section.
2. Keep the world map and country count list as the primary content.
3. Move catalog/source/exclusion details into a compact caption under the map.
4. Run lint, type-check, architecture check, build, and diff whitespace check.

## Result

- Removed the long map description from the section header.
- Removed metric cards and source-summary rows from the map sidebar.
- Kept the map plus top country counts as the visible body of the section.
- Moved source, mapped-record count, country-label count, and exclusion count
  into the compact caption.

## Verification

- `npm run lint`
- `npm run type-check`
- `npm run check:arch`
- `npm run build`
- `curl -I http://localhost:5173/about`
- `git diff --check`

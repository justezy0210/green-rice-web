# About DB Objective Merge

## Goal

Merge the overlapping `Our DB` and `Project Objective` About banners into one
clear section.

## Scope

- Updated `src/pages/AboutPage.tsx`.
- Removed the separate `Project Objective` scene from the About page.
- Kept remaining figure/table components unchanged.
- Renumbered later About scenes.

## Result

- The About page now has one `Green Rice DB Objective` section instead of
  separate `Our DB` and `Project Objective` sections.
- Later sections now run from `04 / Data Scope` through
  `06 / Discovery Workflow`.

## Verification

- `npm run type-check` passed.
- `npm run lint` passed.
- `npm run build` passed.
- `git diff --check` passed.

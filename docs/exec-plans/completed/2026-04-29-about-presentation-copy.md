# About Presentation Copy Refresh

## Goal

Rewrite the About page narrative copy so it follows the user's presentation
script while avoiding repetition with existing figures and tables.

## Scope

- Updated text only in `src/pages/AboutPage.tsx`.
- Kept all figures, tables, layout, and data values unchanged.
- Kept UI copy in English, following project rules.

## Result

- Reframed the About page sections as presentation-readable narrative copy.
- Removed repeated numeric/list detail where the same information is already
  shown in figures or tables.
- Preserved the "not validated causal evidence" framing for Discovery.

## Verification

- `npm run type-check` passed.
- `npm run lint` passed.
- `npm run build` passed.
- `git diff --check` passed.

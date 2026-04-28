# About Page Figures

## Goal

Add visual figures to the `/about` page so the explanation is not text-only.
The figures should clarify the assembly-based pangenome concept, the data layer
integration, and the entity-centered review workflow.

## Result

- Added `src/components/about/AboutFigures.tsx`.
- Inserted three figures into `src/pages/AboutPage.tsx`:
  - resequencing versus assembly-based pangenome comparison
  - Green Rice DB data layer integration
  - entity-centered review workflow
- Kept the page scoped to the current 11-cultivar release.
- Kept Discovery wording conservative and did not re-add the external origin map.

## Verification

- `npm run lint`
- `npm run type-check`
- `npm run check:arch`
- `npm run build`
- `git diff --check`
- `curl -I http://localhost:5173/about`

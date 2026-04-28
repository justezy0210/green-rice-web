# About Page Recomposition

## Goal

Recompose `/about` from a stretched stack of cards into a smaller number of
strong viewport scenes. Each scene should carry one message with a meaningful
figure, while keeping the current 11-cultivar scope and conservative discovery
interpretation.

## Result

- Replaced the previous eight-section About page with four larger narrative
  scenes:
  - Green Rice DB identity
  - assembly-based pangenome rationale
  - current data scope
  - evidence review workflow
- Rebuilt `src/components/about/AboutFigures.tsx` with scene-specific figures:
  - pangenome browser overview
  - reference-mapping versus assembly-based pangenome comparison
  - current data scope figure
  - evidence review workflow figure
- Removed the stretched-card feel from the page layout.
- Kept About copy scoped to 11 Korean rice cultivars.
- Preserved conservative discovery wording.

## Verification

- `npm run lint`
- `npm run type-check`
- `npm run check:arch`
- `npm run build`
- `git diff --check`
- `curl -I http://localhost:5173/about`

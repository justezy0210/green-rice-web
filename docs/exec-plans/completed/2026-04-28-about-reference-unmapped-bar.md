# About Reference Unmapped Bar

## Goal

Simplify the reference-mapping figure. Instead of explaining the limitation with
text boxes, show a reference bar with mapped reads and a separate colored
unmapped bar outside the reference.

## Result

- Removed explanatory boxes from the left Background figure panel.
- Redrew the figure as a reference bar with mapped reads and a separate amber
  unmapped segment beside the reference.
- Added a dashed blocked connection and `x` marker to show that the segment has
  no matching position on the reference.
- Kept layout, mobile behavior, scroll snap, and reveal behavior unchanged.

## Verification

- `npm run type-check`
- `npm run build`
- `git diff --check`

# About Reference SVG Redraw

## Goal

Replace the cramped reference-mapping div diagram with a clearer SVG diagram.
The figure should visually show matching reads mapped to a reference bar and a
separate cultivar-specific segment that cannot attach to the reference.

## Result

- Replaced the nested div diagram with a responsive SVG.
- The new diagram shows mapped reads on a reference bar and a separate amber
  unmapped segment with a blocked dashed connection.
- Removed explanatory text boxes from the figure.
- Preserved the page layout, mobile behavior, scroll snap, and reveal behavior.

## Verification

- `npm run type-check`
- `npm run build`
- `git diff --check`

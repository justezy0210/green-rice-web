# About Reference Mapping Failure Figure

## Goal

Revise the Background figure so the reference-mapping limitation is shown as a
visual mapping failure: reads that match the reference align, while a
reference-missing cultivar segment has nowhere to attach.

## Result

- Replaced the left panel with a success/failure mapping scene.
- The reference-matching reads align to the reference coordinate.
- A cultivar-specific block is shown as having no matching reference segment.
- Kept the right assembly-based pangenome panel unchanged.
- Preserved layout, mobile behavior, scroll snap, and reveal behavior.

## Verification

- `npm run type-check`
- `npm run build`
- `git diff --check`

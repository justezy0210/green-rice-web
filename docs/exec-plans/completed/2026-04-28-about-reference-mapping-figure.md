# About Reference Mapping Figure

## Goal

Improve the `Reference-mapping / One coordinate system` figure because the
current read-line drawing does not clearly show what is represented and what is
missed.

## Result

- Reworked the left Background figure panel as a reference-coordinate diagram.
- Explicitly labeled mapped reads, SNP/indel signals, and hard-to-place
  cultivar-specific sequence.
- Kept the approved About layout, mobile behavior, scroll snap, and text copy.

## Verification

- `npm run type-check`
- `npm run build`
- `git diff --check`

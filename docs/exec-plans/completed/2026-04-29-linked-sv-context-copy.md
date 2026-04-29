# Linked SV Context Copy

Date: 2026-04-29

## Goal

Make the gene detail linked-SV message easier to understand and avoid implying
that a linked SV is drawn in the gene model when only a different SV overlaps
the displayed transcript.

## Changes

- Replaced internal wording about sample-frame coordinates and representative
  transcripts with direct user-facing copy.
- Changed the display logic to check whether the selected linked SV itself is
  present in the gene model overlay.

## Verification

- `npm run type-check`
- `npm run build`
- `git diff --check`

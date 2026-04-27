# Discovery remove representative anchor

## Goal

Remove the user-facing `representative` / anchor concept from Discovery locus
detail pages.

## Problem

The locus detail groups multiple trait comparisons into one review locus. A
single internal representative block has been used for ordering, badge tone,
curator notes, and export. That makes users think one trait comparison is more
important or more validated than the others.

## Decision

The page should treat all trait comparisons in the locus as peers.

Internal grouping may still use one block to derive legacy metadata, but the
detail UI should not expose or depend on a representative trait/block.

## Implementation Tasks

- Remove the `representative` label and highlighted row tone from the evidence
  table.
- Remove representative-first sorting in the evidence table.
- Remove `representative highlighted` copy from the page.
- Remove representative block badges from the summary card.
- Remove source-data controls that export only a representative block.

## Verification

- `npm run type-check`
- `npm run lint`
- `npm run check:arch`
- `npm run build`
- `git diff --check`

## Result

- Removed representative row marking and active row tone from the locus evidence
  table.
- Removed representative-first sorting so rows are ordered by inventory count.
- Removed `representative highlighted` copy from the page.
- Removed the summary block-type badge that came from a single representative
  block.
- Removed the collapsed representative-block source/export section from the
  locus detail page.

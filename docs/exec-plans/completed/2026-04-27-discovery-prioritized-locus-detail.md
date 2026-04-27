# Discovery prioritized locus detail

Status: completed — 2026-04-27

## Goal

Refocus Discovery locus detail pages on high-priority review candidates instead
of foregrounding raw inventory counts. The page should not imply that every
candidate OG row or OG-SV overlap record is biologically meaningful.

## Display Policy

Default-visible SV review candidates:

- `score >= 0.70`, or
- `coding_or_splice` / `utr` with group carrier-frequency gap `>= 0.50`, or
- `promoter_2kb` with group carrier-frequency gap `>= 0.80`.

Rows outside these rules remain part of the underlying inventory but are not
shown in the default review section.

## Implementation

1. Added a frontend helper that classifies high-priority SV pattern rows.
2. Made the locus SV section show only high-priority review candidates by
   default.
3. Renamed the section to `Prioritized SV patterns` to avoid implying
   statistical significance.
4. Refocused the locus summary on trait context and moved raw OG/SV counts
   into a scope note.
5. Removed the separate related-records card from the locus detail page; the
   prioritized SV rows now carry their relevant OG link when available.
6. Kept causal/significant language out of the UI.

## Validation

- `npm run type-check`
- `npm run lint`
- `npm run check:arch`
- `npm run build`
- `git diff --check`
- `curl -I http://localhost:5173/discovery/locus/chr11-21-25mb-development`

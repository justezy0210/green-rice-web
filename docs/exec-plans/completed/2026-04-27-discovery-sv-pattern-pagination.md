# Discovery SV pattern pagination

## Goal

Replace the `Show all` control in the Discovery locus SV pattern section with
pagination.

## Problem

Some loci have hundreds of trait-SV signals. Expanding all rows creates a very
long page and makes the user lose the surrounding locus context.

## Decision

Show 10 SV signals per page. Keep rows sorted by group-frequency gap, and show
the current visible range, total signal count, and unique SV count.

## Implementation Tasks

- Replace `Show all` / `Show first` state with page state.
- Use 10 rows per page.
- Add previous/next pagination controls.
- Reset pagination when the locus block set changes.

## Verification

- `npm run type-check`
- `npm run lint`
- `npm run check:arch`
- `npm run build`
- `git diff --check`

## Result

- Replaced `Show all` / `Show first` with 10-signal pagination.
- The section now displays the current signal range, total signal count, and
  unique SV count.
- Added `Previous` / `Next` controls with disabled states at the boundaries.
- Pagination resets to page 1 when the locus block set changes without using
  effect-driven state resets.

# Discovery locus detail redesign

## Goal

Make `/discovery/locus/:locusSlug` read as a canonical locus page rather
than a representative block detail page.

## Scope

- Add locus-level candidate loading across every block in the locus group.
- Replace repeated trait ribbon + cross-trait table with a single trait
  evidence matrix.
- Replace representative-only candidate table with a locus-wide candidate
  table.
- Reorder page sections so the top answers locus identity, trait coverage,
  representative evidence, and candidates in that order.
- Keep exact representative block and block-level export links available.

## Steps

1. Add a hook for fetching candidates across all blocks in a locus group.
2. Add focused components for summary, trait matrix, candidate table, and
   curator notes.
3. Refactor `DiscoveryLocusPage` to use the new locus-level structure.
4. Run `type-check`, `lint`, `check:arch`, and `build`.

## Result

Completed.

- Added locus-wide candidate loading across every block represented by the
  canonical locus.
- Added focused components for locus summary, trait evidence matrix, locus
  candidate table, and curator notes.
- Reworked `DiscoveryLocusPage` so it reads as a locus-level surface:
  summary, caveat, evidence matrix, representative evidence, locus candidates,
  curator notes, representative block export.
- Verification passed: `type-check`, `lint`, `check:arch`, and `build`.

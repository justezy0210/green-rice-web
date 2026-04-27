# Pangenome and SV UI rollback

Status: completed — 2026-04-27

## Goal

Undo the broad database-style rewrite and restore the previous `/pangenome`
and `/sv` page structures. Only adjust the top summary metric area that looked
too generated.

## Scope

- Restore `/pangenome` to the prior summary-card sections.
- Restore `/sv` to the prior browse-card/table structure.
- Replace only the top metric presentation with a simpler inline summary style.
- Keep the search icon alignment fix.

## Verification

- [x] `npm run lint`
- [x] `npm run type-check`
- [x] `npm run check:arch`
- [x] `git diff --check`

## Result

- Restored the broader `/pangenome` and `/sv` layouts from before the
  database-style rewrite.
- Replaced the top boxed summary metric grids with a smaller inline summary
  line.
- Kept the `/sv` search icon alignment fix.

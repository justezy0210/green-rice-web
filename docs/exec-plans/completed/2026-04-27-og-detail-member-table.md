# OG detail member table

Status: completed — 2026-04-27

## Goal

Make OG detail pages show the genes that belong to the orthogroup per cultivar,
even when the page is opened without a trait query.

## Scope

- Use the default active OrthoFinder version when no trait context is present.
- Add a dedicated `Orthogroup members` table to OG detail.
- Show cultivar, copy count, and linked gene IDs per cultivar.
- Keep trait-specific `Cultivar copy map` as the trait-context/PAV view.

## Non-Goals

- No new storage artifacts.
- No inferred gene absence validation.
- No change to discovery candidate logic.

## Verification

- [x] `npm run lint`
- [x] `npm run type-check`
- [x] `npm run check:arch`
- [x] `git diff --check`
- [x] `curl -I http://localhost:5173/og/OG0041659`

## Result

- Added a dedicated `Orthogroup members` table to OG detail.
- The table lists each cultivar/genome, copy count, and all linked member gene
  IDs with links to gene detail pages.
- OG detail now falls back to the default active OrthoFinder version when no
  trait query is present, so member genes load on entity-first `/og/:ogId`
  pages.

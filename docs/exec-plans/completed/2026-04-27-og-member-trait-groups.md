# OG member trait group labels

Status: completed — 2026-04-27

## Goal

When an OG detail page is opened with an active trait hit, show each cultivar's
phenotype group next to the cultivar name in the member gene table.

## Scope

- Reuse the existing grouping assignments already loaded for `?trait=...`.
- Add group labels beside cultivar names in `Orthogroup members`.
- Preserve the existing trait-hit chip behavior: selecting a chip activates the
  trait context.

## Verification

- [x] `npm run lint`
- [x] `npm run type-check`
- [x] `npm run check:arch`
- [x] `git diff --check`
- [x] `curl -I http://localhost:5173/og/OG0041659?trait=culm_length`

## Result

- Added phenotype group badges beside cultivar names in the `Orthogroup members`
  table when an active `?trait=...` context is present.
- Reused existing grouping assignments from the OG detail trait context.
- Non-trait OG detail pages keep the plain member list without group labels.

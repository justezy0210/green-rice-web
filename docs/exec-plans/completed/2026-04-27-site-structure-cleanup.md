# Site structure cleanup

Status: completed — 2026-04-27

## Goal

Resolve the remaining whole-site structure issues after the public page
composition pass.

## Scope

- Add a catch-all not-found route.
- Align OG and SV detail breadcrumbs with the Browse surfaces.
- Make SV index row click affordance match behavior.
- Remove unused download-discovery and OG copy-map remnants.
- Reduce or eliminate the production bundle chunk warning if it can be done
  without changing page behavior.

## Verification

- [x] `npm run lint`
- [x] `npm run type-check`
- [x] `npm run check:arch`
- [x] `npm run build`
- [x] `git diff --check`
- [x] Sample route `curl -I` checks

## Result

- Status: completed
- Added a public not-found route.
- Aligned OG and SV detail breadcrumbs with Browse surfaces.
- Made SV index rows fully clickable and keyboard-openable.
- Removed unused discovery-download and OG copy-map remnants.
- Added page-level lazy loading; the production chunk-size warning is gone.

# Remove Download discovery results

Status: completed — 2026-04-27

## Goal

Remove the Discovery results block from `/download` so the page focuses on
per-cultivar genome assembly and annotation downloads.

## Scope

- Remove `DiscoveryDownloadSection` from `DownloadPage`.
- Update the `/download` intro copy so it no longer mentions discovery exports.
- Delete the now-unused `DiscoveryDownloadSection` component if it has no
  remaining references.

## Verification

- [x] `npm run lint`
- [x] `npm run type-check`
- [x] `npm run check:arch`
- [x] `git diff --check`
- [x] `curl -I http://localhost:5173/download`

## Result

- Status: completed
- `/download` now shows only per-cultivar genome and annotation downloads.
- The unused `DiscoveryDownloadSection` component was removed.

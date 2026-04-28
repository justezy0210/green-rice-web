# SV Cultivar Filter Labels

## Goal

Make the cultivar filter modes on `/sv` unambiguous for users by replacing
`Specific` and `Shared` with clearer labels.

## Completed

- [x] Renamed mode labels to `Only selected`, `All selected`, and `Any`.
- [x] Updated mode descriptions so users understand whether unselected cultivars
  may also carry the SV.
- [x] Verified with `npm run type-check`, `npm run build`, `npm run lint`, and
  `git diff --check`.

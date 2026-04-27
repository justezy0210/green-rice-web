# Admin data readiness dashboard

Status: completed — 2026-04-27

## Goal

Add an operator-facing Admin section that shows whether the data required by
the public pages is present and versioned.

## Scope

- Add a readiness service/hook for Firestore and Storage-backed artifacts.
- Show status for cultivar metadata, genome files, OrthoFinder/OG artifacts,
  gene indexes, SV release artifacts, Discovery runs, and OG region bundles.
- Wire the panel into `/admin` above existing upload/admin flows.
- Keep Admin as an operational status surface; do not add manual editors for
  derived pipeline artifacts.

## Verification

- [x] `npm run lint`
- [x] `npm run type-check`
- [x] `npm run check:arch`
- [x] `npm run build`
- [x] `git diff --check`
- [x] `curl -I http://localhost:5173/admin`

## Result

- Status: completed
- Added an Admin Data Readiness panel for source records, active releases,
  browse indexes, and region/discovery artifacts.
- Added lightweight Storage artifact probes for active release files.
- Kept existing cultivar and upload flows unchanged below the readiness panel.

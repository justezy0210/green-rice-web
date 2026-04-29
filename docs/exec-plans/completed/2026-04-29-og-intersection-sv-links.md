# OG Intersection SV Links

Date: 2026-04-29

## Goal

When an SV event ID is shown in the OG detail intersection table, clicking the
event ID should open the SV detail page for that event.

## Changes

- Changed OG × SV intersection event IDs from plain text to links:
  `/sv/{eventId}`.
- Preserved SV context on the adjacent gene link by adding `?sv={eventId}`.

## Verification

- `npm run type-check`
- `npm run build`
- `git diff --check`

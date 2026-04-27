# Region focused SV highlight

## Goal

Make Region links from Discovery identify the exact SV event the user came to
inspect.

## Problem

Discovery can link to `/region/:cultivar/:chr/:range?svScope=cultivar`, but
that page may show many DEL events. Users cannot tell which glyph corresponds
to the originating event such as `EV0016276`.

## Decision

- Add `?sv=<eventId>` to Discovery region links.
- Parse `?sv=` in Region page.
- Show a focused SV chip in the Region track header.
- Highlight and label the matching SV glyph in detail mode.

## Verification

- `npm run type-check`
- `npm run lint`
- `npm run check:arch`
- `npm run build`
- `git diff --check`

## Result

- Discovery Region links now include `?sv=<eventId>` alongside `svScope`.
- Region page parses the `sv` query parameter and passes it to the track.
- Region track header shows an `SV focus` chip with clear control.
- Detail-mode SV glyphs highlight and label the focused event id, so users can
  distinguish the originating DEL/INS/COMPLEX from nearby events.

# OG Functional Search Demo Scenarios

Date: 2026-04-29

## Goal

Make the presentation demo start from realistic researcher questions rather
than from known database IDs. In particular, the OG scenario should begin with
a functional keyword such as `bacterial blight`, then lead to a concrete OG
detail page.

## Changes

- Added `/og` functional-description search support using
  `orthofinder/v{version}/og_descriptions.json`.
- Added matched description snippets to OG table rows when a function query
  matches an OG.
- Updated the OG search placeholder to mention function keywords.
- Rewrote the presentation demo scenario so the resistance example starts from
  a function search and then opens `OG0000297`.
- Linked the concrete demo-scenario document from the presentation outline.

## Verification

- `npm run type-check`
- `npm run build`
- `git diff --check`

## Notes

- The feature uses the IRGSP representative OG descriptions, not a causal
  validation result.
- The presentation wording should still describe these examples as candidate
  evidence requiring follow-up validation.

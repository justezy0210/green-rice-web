# Discovery link simplification

## Goal

Reduce the public Discovery link graph so visitors do not get pulled into
run-specific pipeline pages while trying to understand a review locus.

## Problem

The current UI exposes two structures at the same level:

- user-facing review flow: Discovery home -> review locus -> OG/SV/Gene/Region
- pipeline/provenance flow: run -> step pages -> block/candidate/source rows

That makes the site feel like a web of similarly weighted pages. The
run-specific pages are still useful as technical source data, but they should
not be the primary navigation path.

## Public Navigation Rule

Primary public links should follow:

```text
Discovery -> Review locus -> OG / SV / Gene / Region
```

Run-scoped links should be kept as technical/provenance links only:

```text
/discovery/:runId
/discovery/:runId/phenotype
/discovery/:runId/orthogroups
/discovery/:runId/variants
/discovery/:runId/intersections
/discovery/:runId/candidates
/discovery/:runId/candidate/:candidateId
/discovery/:runId/blocks
/discovery/:runId/block/:blockId
```

## Implementation Tasks

- Remove the run overview link cluster from the public Discovery home.
- Remove visible source-block links from the locus summary and trait matrix.
- Move candidate/source block links inside small technical details sections.
- Keep OG, SV, Gene, and Region links visible as primary inspection links.
- Point entity/region block backlinks to canonical `/discovery/locus/:slug`
  where the data has enough block coordinates.
- Redirect legacy `/explore/og/:ogId` to `/og/:ogId` and `/explore/*` to
  `/discovery`.
- Mark run/block pages as technical source pages when opened directly.

## Non-Goals

- Do not delete run-specific pages in this pass.
- Do not migrate Firestore documents.
- Do not remove candidate detail route yet; just stop promoting it in public
  flows.

## Verification

- `npm run type-check`
- `npm run lint`
- `npm run check:arch`
- `npm run build`
- `git diff --check`
- Smoke check `/discovery` and `/discovery/locus/chr11-21-25mb-development`

## Result

Implemented.

- Discovery home now exposes the review-locus matrix as the primary entry and
  no longer shows the run-level Candidates / Blocks / Open link cluster.
- Locus detail keeps OG, gene, SV, and region links visible while source block
  and export links live under a collapsed Source data section.
- Trait evidence table no longer links every row into source block pages.
- Candidate/source links inside locus evidence cards are collapsed under
  Source links.
- Entity and region backlinks now prefer canonical
  `/discovery/locus/:locusSlug` links when block coordinates are available.
- Direct block pages are marked as technical source pages and link back to the
  canonical review locus.
- Legacy `/explore/og/:ogId` redirects to `/og/:ogId`; `/explore/*` redirects
  to `/discovery`.

Verification completed:

- `npm run type-check`
- `npm run lint`
- `npm run check:arch`
- `npm run build`
- `git diff --check`
- `curl` smoke checks for `/discovery`, the chr11 review locus, and the legacy
  explore OG route returned 200

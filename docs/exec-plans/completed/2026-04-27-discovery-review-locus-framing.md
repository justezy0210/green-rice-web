# Discovery review-locus framing

## Goal

Refocus the Discovery locus detail page around a review locus rather than a
causal lead. The page should help a database visitor understand:

- which trait-defined evidence rows point to this genomic window
- whether the available SV pattern differs between trait groups
- which OG, gene, SV, candidate, and region handles are useful for follow-up
- why these handles are candidate-discovery evidence only

## Product Position

Discovery is not a final causal-call page. It is an evidence review surface
that links trait grouping, OG copy/presence evidence, SV group-frequency
evidence, and entity pages.

Avoid language that implies:

- causal gene
- causal SV
- marker-ready result
- validated PAV
- lead as a final biological conclusion

Preferred terms:

- review locus
- evidence handle
- OG handle
- gene handle
- SV event
- source block
- candidate-discovery signal

## Page Structure

1. Locus overview
   - review-locus identity
   - genomic region
   - trait context count
   - candidate OG observations
   - OG-SV overlap count
   - first follow-up links as handles, not final leads

2. Trait evidence at this locus
   - rows are source blocks / trait contexts
   - show grouping, evidence type, counts, OG handles, SV events, and source
   - representative row remains highlighted

3. SV carrier pattern by group
   - show ALT-frequency bars for trait groups
   - show per-cultivar carrier strip
   - link each event to `/sv/:eventId`

4. Candidate evidence units
   - grouped OG/SV/gene handles for follow-up
   - score remains a review/candidate score, not a causal score
   - source candidate/block links remain available

5. Curator notes and export
   - keep after the evidence surfaces

## Implementation Tasks

- Update `DiscoveryLocusPage` section order so trait evidence and SV pattern
  come before candidate evidence units.
- Rewrite `DiscoveryLocusSummaryCard` copy and labels to use handle-based
  language.
- Link summary SV handles to `/sv/:eventId` instead of only region context.
- Rewrite `TopCandidateLeads` headings and score labels to avoid causal-lead
  framing.
- Update `LocusEvidenceMatrix` labels and SV event links.
- Update any unused but related locus candidate table labels/links if they can
  create inconsistent framing later.

## Verification

- `npm run type-check`
- `npm run lint`
- `npm run check:arch`
- `npm run build`
- `git diff --check`
- Route smoke check for `/discovery/locus/chr11-21-25mb-development`

## Result

Implemented.

- The locus detail page now presents trait evidence before candidate evidence
  units.
- The SV section is framed as carrier-pattern evidence and remains directly
  linked to `/sv/:eventId`.
- Summary handles now use OG/gene/SV/region language instead of causal-lead
  framing.
- SV handles in the summary and evidence matrix route to SV entity detail
  pages.
- Gene handles preserve SV context through `?sv=` where available.

Verification completed:

- `npm run type-check`
- `npm run lint`
- `npm run check:arch`
- `npm run build`
- `git diff --check`
- `curl` route smoke checks on ports 5173 and 5175 returned 200

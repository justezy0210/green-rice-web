# Candidate discovery selection plan documentation

## Goal

Document the improved candidate-discovery selection model so the Discovery
module no longer treats broad OG screening hits, review loci, and final lead
priorities as the same concept.

## Scope

- Summarize limitations in the current raw p-value / copy-count-first
  candidate pipeline.
- Define a clearer three-level model: discovery hit, review locus, priority
  lead.
- Define confidence labels, selection gates, scoring ingredients, and UI
  implications.
- Keep this as a design document only; no pipeline implementation in this
  change.

## Result

Completed on 2026-04-27.

- Added `docs/design-docs/candidate-discovery-selection-plan.md`.
- Linked the new selection model document from
  `docs/design-docs/analysis-block-ui.md`.
- No pipeline or UI code changed in this documentation pass.

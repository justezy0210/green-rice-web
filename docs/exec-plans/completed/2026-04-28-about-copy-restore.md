# About Copy Restore

## Goal

Restore the user's original About-page concepts into the current four-scene
layout without changing the approved layout, sizing, scroll snap, or reveal
behavior.

## Result

- Restored the original concepts into the four About scenes:
  - database identity beyond cultivar metadata only
  - resequencing/reference-mapping limitations
  - assembly-based Korean cultivar pangenome rationale
  - project objective and current 11-cultivar data scope
  - entity-centered browsing instead of a trait-first answer portal
  - orthogroup/PAV, SV, and discovery review workflows
  - hypothesis-generating interpretation boundary
- Kept UI copy in English.
- Kept the existing layout, banner sizing, scroll snap, and reveal behavior.

## Verification

- `npm run lint`
- `npm run type-check`
- `npm run build`
- `git diff --check`
- `curl -I http://localhost:5173/about`

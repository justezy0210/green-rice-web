# OG region release — v{of}_g{g}

Generated: YYYY-MM-DDTHH:MM:SSZ (UTC)
Operator: @handle
Extractor git sha: <short>

## Input fingerprints

| Input | sha256 / contentHash | Size |
|---|---|---|
| `cactus/pg.hal` | … | … |
| `cactus/pg.gbz` | … | … |
| `data/green-rice-pg.vcf.gz` | … | … |
| `og_gene_coords/` (content hash) | … | — |
| `candidate_ogs.txt` | … | … lines |
| `groupings_all.json` | … | … |

## Totals

- candidateOgs: …
- ogsEmitted:  …
- ogsSkipped:  …  (by reason: …)
- clustersEmitted: …
- graphStatus: ok=… empty=… error=…
- usableTraits: …

## Pointer body (verbatim)

```json
{
  "activeOrthofinderVersion": …,
  "activeGroupingVersion":   …,
  "generatedAt":             "…",
  "appVersion":              "…",
  "graphManifest":           "og_region_graph/v…_g…/_manifest.json",
  "afManifests": {
    "heading_date": "og_region_af/v…_g…/heading_date/_manifest.json"
    …
  }
}
```

## Release decision

Judgment rule (see plan 2026-04-20-og-region-release-observability.md § Release decision algorithm):
1. promote preflight invariant fail → release note is NOT created (SystemExit)
2. any smoke HEAD != 200 → `blocked`
3. validator or smoke has documented waived known-gaps only → `pass-with-known-gaps`
4. all green → `pass`

- Status: pass | pass-with-known-gaps | blocked
- Blocking issues: (blocked only — HTTP code + failing path)
- Known gaps (waived): (pass-with-known-gaps only — link waiver doc / issue id)
- Pointer object generation: …  ← promote stdout `Pointer object generation=`. Overwrite id, not content hash.
- Invariants verified at promote time (copy from stdout):
  - [ ] candidateOgs / ogsEmitted / ogsSkipped sum
  - [ ] ogs dict length == candidateOgs
  - [ ] graph statusCounts sum == clustersEmitted
  - [ ] AF trait triple match (dirs / summary / per-trait manifests)
  - [ ] final prefixes empty
  - [ ] smoke N HEAD 200

## Smoke sampling log

Sample-based — not full coverage. For the full contract check, see
`verify-og-region-bundle.ts` run log.

- pointer: 200 … bytes
- graph manifest: 200 …
- sample AF manifest (heading_date): 200 …
- sample per-cluster graph: 200 …
- sample per-cluster AF: 200 …
- Smoke count: … HEAD 200  ← promote stdout `Smoke count:`

## Notes

Decision-affecting information belongs in the Release decision section
above. This Notes block is for free-form remarks: skipped OG breakdown
context, known issues not formally waived, operator observations,
follow-ups for the next release.

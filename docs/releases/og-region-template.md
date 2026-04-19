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

## Smoke log

- pointer: 200 … bytes
- graph manifest: 200 …
- sample AF manifest (heading_date): 200 …
- sample per-cluster graph: 200 …
- sample per-cluster AF: 200 …

## Notes

Free-form remarks: skipped OG breakdown, known issues, follow-ups.

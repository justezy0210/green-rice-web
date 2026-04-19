# Green Rice DB discovery bundle

**Version:** v{{orthofinderVersion}}_g{{groupingVersion}}
**App build:** {{appVersion}}
**Generated:** {{generatedAt}} (UTC)
**Bundle:** {{bundleKind}}{{#trait}} · trait = {{traitId}}{{/trait}}

## Bundle purpose

This directory contains **candidate discovery exports** from Green Rice DB.

- This is **not a validation artifact**. Every candidate is a starting
  point for downstream wet-lab or bioinformatic follow-up, not a
  confirmed finding.
- The bundle is scoped to **16 Korean temperate japonica cultivars** in
  this panel, of which **11** are in the Cactus pangenome alignment.
  Treat it as panel-scoped evidence, not as representative of Korean
  rice as a whole.
- Downloads are **not marker-ready, not primer-ready, not causal**.
  Marker/primer/KASP/CAPS/MAS/GEBV use cases are out of scope for this
  database.

## Files in this bundle

{{fileTable}}

## Column dictionary — Tier A

### candidates.tsv
- `trait` — trait id from `data/traits.json`
- `ogId` — OrthoFinder orthogroup id, format `OG\d{7}`
- `rank` — dense ascending rank by `pValue`, tie-break by `ogId`
- `pValue` — Mann-Whitney U raw p-value (6 sig-fig scientific)
- `pValueAdjBH` — Benjamini–Hochberg adjusted p-value, scope = all
  tested OGs for this trait
- `log2FC` — log2(mean groupHigh copy count / mean groupLow copy count),
  4 decimals
- `effectSize` — Cliff's delta derived from U, range [−1, 1]
- `effectSizeSign` — `positive`, `negative`, or `zero` (|δ| < 1e-4)
- `groupLabels` — pipe-separated low→high labels, e.g. `early|late`
- `nPerGroup` — pipe-separated ints aligned with `groupLabels`
- `nMissing` — cultivars with missing phenotype for this trait
- `irgspRepresentative` — comma-separated transcript ids from
  `og_descriptions.json`
- `description` — free text; tabs and newlines stripped
- `llmCategory` — LLM-assigned functional category, or `NA`
- `analysisStatus` — `strong` (adjP ≤ 0.05 AND |δ| ≥ 0.4), `borderline`
  (raw P ≤ 0.05 AND not strong), or `weak`
- `orthofinderVersion`, `groupingVersion` — version provenance

`NA` is the null marker across all TSVs. Empty string is never used.

### candidate_irgsp_coords.bed (BED6+)
- Coordinate system: **IRGSP-1.0, 0-based half-open** (standard BED)
- Columns: `chrom start end name score strand ogId transcriptId source`
- `name` = `{ogId}:{transcriptId}`
- `score` = `clamp(round(-log10(pValue) * 100), 0, 1000)`
- `source` = `irgsp_representative` for this release

Ready for `bedtools sort` and `bedtools intersect`. Each row is a
representative IRGSP transcript for the OG — the row does NOT claim the
OG's locus is limited to this transcript. Cultivar-side coordinates
arrive in `candidate_members.tsv` when Tier B ships.

### candidate_copycount_matrix.tsv
- Rows: one per candidate OG, ordered by `rank`
- Columns: `ogId` plus one per cultivar, in `data/cultivars.json` panel
  order, **filtered to `pangenome:true` (11 cultivars)**. Phenotype-only
  cultivars are not in the OrthoFinder input and are excluded to avoid
  encoding "absent" as `0`.
- Cells: non-negative integers from `Orthogroups.GeneCount.tsv`

## Statistical methods

- **Test**: Mann-Whitney U on per-cultivar OG copy count, with
  phenotype groupings proposed by the grouping pipeline.
- **Multiple testing**: Benjamini–Hochberg across all tested OGs for
  each trait (not across traits).
- **Effect size**: Cliff's delta derived from the U statistic.
- **log2FC**: computed on group means with a +1 pseudocount.

## Grouping caveat

Phenotype groupings are **proposed by a Gaussian mixture model**, not
biological ground truth. Per-cultivar probabilities and borderline flags
are UI-only caveats and are deliberately not exported.

## Panel-scope caveat

Repeat: this panel is **16 Korean temperate japonica cultivars**, 11 of
which are in the Cactus pangenome. Treat results as panel-scoped
evidence. A candidate OG here is not automatically a candidate in
broader Korean rice germplasm, let alone in *Oryza sativa* at large.

## How to cite

Cite by URL:
```
https://<green-rice-db host>/download/traits/{{traitId}}/v{{orthofinderVersion}}_g{{groupingVersion}}/
```
The `v{of}_g{g}` segment is immutable once published — a future
recompute ships under a new version pair.

## Bundle status

{{bundleStatus}}

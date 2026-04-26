# Discovery Result Downloads

Status: active — 2026-04-19 (rev2 after Codex plan-review round 2)
Source: Codex `general-review` on the initial proposal, then two
`plan-review` rounds. Round 1 flagged 10 blocker conditions; rev1 closed
them. Round 2 surfaced 4 remaining contract conflicts (usable=false
contract self-conflict, Tier B required vs optional, same-version
republish policy, UI active-version data source). rev2 closes those with
lead judgement — Codex verify budget for this plan is spent.

## Decision

Expose candidate-discovery results as **pre-computed, version-snapshotted,
per-trait downloads** plus one cross-trait long file. The generator is the
sole source of the candidate-selection predicate; the UI reads a generated
`_manifest.json` and does not re-run any filter. Version `(of, g)` is
tracked in an explicit SSOT file, surfaced in URLs, and embedded in each
artifact's header.

Explicitly dropped:
- VCF excerpts (scope exclusion)
- Standalone grouping-probability CSV (folded into `trait_metadata.tsv`)
- Any implication that UI and generator share a runtime predicate

## Why this shape

- Per-trait bulk, not user-filtered, matches all three primary users'
  starting workflow (scan, then take off-site).
- Version-snapshotted URL (`/v{orthofinderVersion}_g{groupingVersion}/`)
  makes Methods-section citation reproducible.
- Long-format cross-trait prevents pleiotropy / one-hot misreading.

## Problem

Today the web app lets users download input data (phenotype CSV,
per-cultivar genome files) but no discovery outputs. This blocks
off-site analysis (BLAST, `bedtools intersect`, copy-count inspection)
and makes the DB un-citable in Methods.

## Goal

**This release (Tier A):** three required files per trait
(`candidates.tsv`, `candidate_irgsp_coords.bed`,
`candidate_copycount_matrix.tsv`) plus one shared cross-trait file
(`cross_trait_candidates.tsv`). Every bundle directory also has a
generated `README.md`. Each artifact published under an immutable
`/v{of}_g{g}/` path, discoverable through a generated manifest, with
verification automation and a documented scope-safety posture.

**Tier B (`candidate_members.tsv`, `trait_metadata.tsv`) is optional
this release.** Bundles without Tier B still pass verification; UI
renders whatever files the manifest lists. Tier B targets a follow-up
release but may ship in the same PR if ready. No plan field
contradicts this.

## Scope — In

### 0. Active version SSOT (Condition #1)

New file at repo root: **`data/download_versions.json`**.

```json
{
  "comment": "Active (orthofinderVersion, groupingVersion) pair exposed under /download. Generator and UI MUST read this — never infer from max numbers.",
  "activeOrthofinderVersion": 3,
  "activeGroupingVersion": 7,
  "updatedAt": "2026-04-19T00:00:00Z"
}
```

- Single source of truth. Cross-language manifest (like
  `data/cultivars.json`): sync into `functions-python/generated_manifests/`
  via the existing `sync:manifests` pipeline.
- **Generator-only consumer.** The generator reads
  `download_versions.json` to pick `(of, g)` and writes that pair into
  `downloads/_manifest.json`. The UI reads `_manifest.json` exclusively
  and never touches `download_versions.json`. This avoids two
  inconsistent "active version" reads at runtime.
- Cross-trait file consumes the SAME pair — every trait in
  `cross_trait_candidates.tsv` is computed against one shared `(of, g)`.
- Schema check in `scripts/check-traits-schema.ts` extends to enforce
  both fields are positive integers.

### 1. URL and Storage layout (Condition #6 — name consistency)

Per-trait directory per version pair:
```
/download/traits/{traitId}/v{of}_g{g}/
  candidates.tsv
  candidate_irgsp_coords.bed
  candidate_copycount_matrix.tsv
  candidate_members.tsv        (Tier B)
  trait_metadata.tsv           (Tier B)
  README.md
```

Cross-trait directory:
```
/download/cross-trait/v{of}_g{g}/
  cross_trait_candidates.tsv
  README.md
```

Firebase Storage mirrors these paths beneath `downloads/`. **File name
`cross_trait_candidates.tsv` is the single canonical form** — the earlier
draft's `candidates_long.tsv` is retired and must not appear anywhere.

### 2. Staging / promote / idempotency (Condition #8)

**Implementation note (rev2 final):** staging is a **local filesystem
directory**, NOT a Firebase prefix. The generator writes to
`<local>/v{of}_g{g}_{utcIsoBasic}/…`, the verifier runs against that
local tree, and the promote script is the ONLY step that touches
Firebase Storage. This is simpler than round-tripping through
`downloads/_staging/**` and provides the same atomicity guarantee: until
promote completes, the final prefixes on Firebase are untouched.

1. Generate all files of a run to a local directory
   `<staging-root>/v{of}_g{g}_{utcIsoBasic}/…` (dry-run-safe; no
   Firebase writes).
2. Run the verification script (see §10) against the local staging
   directory.
3. On pass: upload each file from staging into its final
   `downloads/traits/{t}/v{of}_g{g}/` or
   `downloads/cross-trait/v{of}_g{g}/` object. `downloads/_manifest.json`
   is uploaded **last**.
4. Local staging is left in place for diagnostics; `downloads/_staging/`
   on Firebase is deliberately unused (storage rules still deny it as a
   safety net).

**Published-URL immutability policy (locked):**
- The final prefix `downloads/traits/{t}/v{of}_g{g}/` and
  `downloads/cross-trait/v{of}_g{g}/` are **immutable once promoted**.
- If the final prefix already exists when the generator starts, the run
  **fails, period** — no `--force` flag. Correcting an artifact requires
  bumping `orthofinderVersion` or `groupingVersion` in
  `data/download_versions.json` (or in upstream, which then increments
  the version naturally) and regenerating under the new pair.
- The only overwritable location is `downloads/_staging/` and
  `downloads/_manifest.json` (which is a single pointer file, updated at
  the very end of promote — see §9).
- This trades operational convenience for citation stability: a URL that
  appears in someone's Methods section must keep returning the same
  bytes.

### 3. Timestamp / byte-identical policy (Condition #2)

**`generatedAt` does NOT live in any TSV/BED file.** It lives only in
two places:

- `downloads/_manifest.json` (per-run metadata — see §9)
- The bundle `README.md` (human-readable)

This makes "two runs on the same `(of, g)` produce byte-identical TSV/BED
artifacts" an executable acceptance check. The only bytes that differ
across reruns are in `_manifest.json` and `README.md`, both of which are
metadata.

### 4. Tier A files — column specs (Condition #3)

#### 4a. `candidates.tsv` (per trait)

Columns in order:

| # | Column | Type | Null | Enum / format | Notes |
|---|---|---|---|---|---|
| 1 | `trait` | string | no | lowercase trait id from `data/traits.json` | |
| 2 | `ogId` | string | no | `^OG\d{7}$` | OrthoFinder OG id |
| 3 | `rank` | int | no | ≥ 1, dense, asc by `pValue` with tie-break by `ogId` | |
| 4 | `pValue` | float | no | 6 sig-fig scientific e.g. `3.45e-04` | Mann-Whitney U raw |
| 5 | `pValueAdjBH` | float | yes (`NA`) | 6 sig-fig scientific | BH over all tested OGs for this trait |
| 6 | `log2FC` | float | yes (`NA`) | 4 decimal places | mean(groupB copy count) / mean(groupA copy count) in log2 |
| 7 | `effectSize` | float | yes (`NA`) | 4 decimal places | **Cliff's delta (U-derived)**. Range [−1, 1] |
| 8 | `effectSizeSign` | enum | no | one of `positive`, `negative`, `zero` | sign of `effectSize` with `zero` at |δ| < 1e-4 |
| 9 | `groupLabels` | string | no | pipe-separated, order = lo→hi, e.g. `early|late` | from `trait_metadata` |
| 10 | `nPerGroup` | string | no | pipe-separated ints in same order, e.g. `4|7` | |
| 11 | `nMissing` | int | no | ≥ 0 | cultivars with missing phenotype for this trait |
| 12 | `irgspRepresentative` | string | yes (`NA`) | comma-separated transcript ids | from `og_descriptions.json` |
| 13 | `description` | string | yes (`NA`) | free text, tab/newline stripped | from `og_descriptions.json` |
| 14 | `llmCategory` | string | yes (`NA`) | free text | from `og_categories.json` if file exists for this `of`; else `NA` |
| 15 | `analysisStatus` | enum | no | `strong`, `borderline`, `weak` | rules below |
| 16 | `orthofinderVersion` | int | no | | from SSOT |
| 17 | `groupingVersion` | int | no | | from SSOT |

`analysisStatus` rules (locked):
- `strong`: `pValueAdjBH ≤ 0.05` AND `|effectSize| ≥ 0.4`
- `borderline`: `pValue ≤ 0.05` AND NOT strong
- `weak`: tested, did not meet either threshold

The `not_tested` sentinel has been retired. `usable=false` traits carry
no data rows — see §7. Keeping `not_tested` inside the schema would force
nullable `ogId` / `rank`, which the §4a column contract forbids.

Row order: asc `rank`, tie-break asc `ogId`.

Leading comment lines (before TSV header):
```
#green_rice_db_candidates  v{of}_g{g}  trait={traitId}
#panel: 16 Korean temperate japonica cultivars in this panel — not pan-Korean rice
#pangenome_coverage: 11 of 16 cultivars present in Cactus pangenome VCF
#not_marker_ready  not_primer_ready  not_causal
#coords_source: IRGSP-1.0 reference coordinates where applicable
#reading this file: header is the first non-# line
```

Null rule: `NA`. Empty string is never used. Tabs, newlines, carriage
returns are stripped from string cells.

Float rules: fixed 4 decimal places for bounded metrics; 6-sig-fig
scientific for p-values; ASCII digits only, no thousand separators.

#### 4b. `candidate_irgsp_coords.bed` (per trait, BED6+)

Header (all lines starting with `#`):
```
#green_rice_db_bed  v{of}_g{g}  trait={traitId}
#panel: 16 Korean temperate japonica cultivars in this panel — not pan-Korean rice
#coords: IRGSP-1.0, 0-based half-open (BED convention)
#extras_after_bed6: ogId transcriptId source
#score_rule: clamp(round(-log10(pValue) * 100), 0, 1000)
#not_marker_ready  not_primer_ready  not_causal
```

Columns: `chrom | start | end | name | score | strand | ogId | transcriptId | source`

- `name` = `{ogId}:{transcriptId}`
- `score` = `clamp(round(-log10(pValue) * 100), 0, 1000)` — UCSC-ish range
- `strand` = `+` / `-` / `.` (from GFF3 if known, else `.`)
- `source` = `irgsp_representative` (only source emitted in Tier A)

Row generation:
- **Pair source**: `(ogId, transcriptId)` pairs come from
  `og_descriptions.json` (which transcripts represent the OG).
- **Coordinate source**: `chrom`, `start`, `end`, `strand` come from
  the IRGSP GFF3 feature keyed by `transcriptId`. Transcripts present
  in `og_descriptions.json` but missing from the GFF3 index are
  skipped with a generator log line (not an error).
- Sorted: `chrom` ASCII asc, then `start` asc.

#### 4c. `candidate_copycount_matrix.tsv` (per trait, wide)

Header comment:
```
#green_rice_db_copycount_matrix  v{of}_g{g}  trait={traitId}
#panel_row_denominator: 11 cultivars (Cactus pangenome participants only)
#panel_all_16_cultivars_phenotype_is_in_candidates.tsv_not_this_file
#source: Orthogroups.GeneCount.tsv
```

- **Only pangenome cultivars** are columns (11 of 16). Including all 16
  risks users treating phenotype-only cultivars as copy-count zero when
  they are simply absent from the OrthoFinder input.
- Column order: fixed `data/cultivars.json` order (filter to
  `pangenome:true`).
- Cell type: int ≥ 0.
- Rows: one per candidate OG, ordered by `rank` from `candidates.tsv`.

### 5. Tier B files

#### 5a. `candidate_members.tsv` (per trait, long) — Condition #4

Columns: `ogId | cultivar | geneId | transcript | description | cultivarChrom | cultivarStart | cultivarEnd`

Locked join rules:
- **Member iteration**: one row per `(ogId, cultivar, geneId, transcript)`
  from `orthofinder/v{of}/og-members/chunk_*.json`.
- **Representative choice**: `transcript` = the full transcript id as
  stored in the member chunk. Do NOT collapse to gene; do NOT pick a
  single representative — emit all transcripts of a gene.
- **Coord source**: `og_gene_coords/chunk_*.json` keyed by `(ogId,
  cultivar)`. If a cultivar has no coord entry for this OG, emit blank
  (`NA`) in the three coord columns. Do NOT drop the row.
- **Description**: for IRGSP rows only, use `og_descriptions.json`. For
  cultivar rows, `description` is always `NA` (cultivar gene descriptions
  are not in the pipeline today).
- **Dedupe key**: `(ogId, cultivar, geneId, transcript)`. Duplicates in
  source data are collapsed; the first occurrence wins.
- **Row order**: `ogId` asc, then `cultivar` in
  `data/cultivars.json` order (panel order, NOT ASCII), then `geneId`
  asc, then `transcript` asc.
- **Memory**: stream chunks one at a time; never load all chunks at once.

#### 5b. `trait_metadata.tsv` (per trait, single row)

Columns: `trait | method | groupLabels | groupSizes | thresholds | nObserved | missingRate | usable | note | panelSize | pangenomeCovered | orthofinderVersion | groupingVersion`

- `groupLabels`, `groupSizes`, `thresholds`: pipe-separated same-order
  lists (matches `candidates.tsv` column 9–10).
- `method` ∈ `{gmm, fixed-class, none}`.
- `usable`: `true` / `false` (lowercase).
- `panelSize` = 16 (constant from `data/cultivars.json` length).
- `pangenomeCovered` = count of `pangenome:true` cultivars (= 11 today).

This is the safe reshape of the previous grouping-probability CSV. Raw
per-cultivar `confidence` and `probability` values **do not surface in
any download** — they remain UI-only caveats.

### 6. Cross-trait file

`cross_trait_candidates.tsv` — long format, single file:

Columns: `trait | ogId | rank | pValue | pValueAdjBH | log2FC | effectSize | effectSizeSign | irgspRepresentative | description | orthofinderVersion | groupingVersion`

- Same column specs as `candidates.tsv` for overlapping fields. Columns
  `groupLabels`, `nPerGroup`, `nMissing`, `llmCategory`, `analysisStatus`
  are deliberately omitted here — per-trait context belongs in per-trait
  files.
- Row ordering: `trait` asc, then `rank` asc, **tie-break `ogId` asc**
  for deterministic diff.
- All rows share the SAME `(of, g)` pair from the SSOT.

Header comment includes:
```
#warning: ranks are per-trait and NOT comparable across traits
#warning: an OG appearing under multiple traits does not imply pleiotropy — each row is an independent analysis
```

### 7. `usable=false` trait handling (Condition #5)

`usable=false` means the grouping pipeline could not produce a trait
grouping (e.g., insufficient observations). The bundle still exists so
consumers can see the trait was processed — but no data rows are emitted.

- **The directory is still created**: `downloads/traits/{t}/v{of}_g{g}/`.
- **All Tier A + Tier B TSV/BED files** are emitted with header
  comments + the schema header row only. Zero data rows.
- **`README.md`** is always present and notes `usable=false` + `note`
  text in its "Bundle status" section.
- **`trait_metadata.tsv`** (if Tier B ships this release) is emitted
  with one row whose `usable=false` column carries the grouping
  pipeline's `note`. If Tier B does not ship, the same `usable=false`
  signal lives in `README.md` and in `_manifest.json`
  (`traits.{t}.usable = false`).
- "Computed, no signal" vs "not computed yet" distinction is answered
  by `_manifest.json`: presence of the trait key = computed;
  `usable=false` = computed but not runnable.

No `not_tested` sentinel row anywhere. `candidates.tsv` for a
`usable=false` trait is strictly header + comments.

### 8. README template

File: `scripts/download_readme_template.md` with `{{placeholder}}`
variables. Generator substitutes and emits per-bundle copies.

Variables:
- `{{bundleKind}}` — `per_trait` or `cross_trait`
- `{{traitId}}` — only for per-trait; else unset
- `{{orthofinderVersion}}`, `{{groupingVersion}}`
- `{{generatedAt}}` — ISO UTC
- `{{appVersion}}` — from a `APP_VERSION` env or git short hash at
  generation time
- `{{fileSizes}}` — table generated from the files in the same directory
- `{{bundlePurpose}}` — `discovery_export` (same string for all bundles)

README sections (per-trait example; cross-trait template is a shorter
subset):
1. Bundle purpose — "candidate discovery export; not validation, not
   marker-ready, not causal"
2. Panel definition — `16 Korean temperate japonica cultivars total, 11 in
   Cactus pangenome, reference IRGSP-1.0`
3. Files in this bundle — name + size + one-line purpose
4. Column dictionary — per file, links to §4 of this plan in spirit
5. Coordinate convention — per file
6. Statistical method definitions — MWU, BH, Cliff's delta, log2FC
7. Grouping caveat — proposed grouping, not ground truth
8. Panel-scope caveat — this panel, not pan-Korean rice
9. Not-marker-ready / not-causal caveat
10. Version provenance — `(of, g)`, generator app version, generation
    date
11. How to cite — template sentence with a URL back to
    `/download/traits/{t}/v{of}_g{g}/`

### 9. UI data source (Condition #9)

**New file**: `downloads/_manifest.json` (Storage, public read). This is
the UI's single source of truth — the UI never reads
`data/download_versions.json` directly.

Write order inside promote:
1. All per-trait files + cross-trait files land at their final prefixes.
2. A staging `_manifest.json` sits inside `downloads/_staging/{runId}/`
   and is included in §10 verification (its SHA256 entries are hashed
   against the staged files).
3. **Last step**: the staging manifest is published as
   `downloads/_manifest.json`. Until this write lands, the UI keeps
   pointing at the previous active version. If any earlier step fails,
   the final manifest is never flipped — users never see a half-released
   version pair.

Shape:

```json
{
  "orthofinderVersion": 3,
  "groupingVersion": 7,
  "generatedAt": "2026-04-19T12:00:00Z",
  "appVersion": "b52f0f3",
  "traits": {
    "heading_date": {
      "files": {
        "candidates.tsv":               { "size": 12345, "sha256": "..." },
        "candidate_irgsp_coords.bed":   { "size": 2345,  "sha256": "..." },
        "candidate_copycount_matrix.tsv": { "size": 6789, "sha256": "..." },
        "candidate_members.tsv":        { "size": 23456, "sha256": "..." },
        "trait_metadata.tsv":           { "size": 456,   "sha256": "..." },
        "README.md":                    { "size": 1234,  "sha256": "..." }
      },
      "usable": true
    }
  },
  "crossTrait": {
    "files": {
      "cross_trait_candidates.tsv": { "size": 34567, "sha256": "..." },
      "README.md":                   { "size": 1234,  "sha256": "..." }
    }
  }
}
```

- UI reads this single file (`downloads/_manifest.json`) and renders the
  `/download` Discovery section. No Storage `list()` calls. No direct
  read of `data/download_versions.json` from the browser.
- Each trait entry MAY omit Tier-B keys (`candidate_members.tsv`,
  `trait_metadata.tsv`) if those files were not generated — the UI
  renders whatever the manifest lists.
- `sha256` enables clients (e.g., a future CLI) to verify integrity.
- Exactly one `_manifest.json` exists — it reflects the current active
  `(of, g)`. Historical versions stay at their prefix but the manifest
  covers only the active pair. (Changing this to include history is a
  follow-up.)

### 10. Verification script (Condition #8)

New: **`scripts/verify-download-bundles.ts`** (runs against the staging
prefix before promote).

Checks:
1. Every expected file is present per trait and cross-trait (from
   `data/traits.json`).
2. `candidates.tsv` header matches the column list in §4a exactly.
3. BED file passes `bedtools sort && bedtools intersect` smoke test
   against a tiny fixture BED shipped under `scripts/fixtures/`.
4. Copycount matrix column count = 1 + (pangenome cultivar count).
5. Every TSV/BED file's first non-blank line is either the locked header
   or a `#` comment starting with `#green_rice_db_`.
6. Cross-trait row count equals the sum of per-trait `candidates.tsv`
   non-`not_tested` rows.
7. `_manifest.json` SHA256 for every listed file matches the file on
   disk byte-for-byte.
8. Determinism: re-run the generator into a second staging prefix and
   diff — every TSV/BED must be byte-identical.
9. Scope-word audit (safer than a raw grep): parse every TSV/BED header
   + every generated README, tokenize, and forbid the word list
   `{marker, primer, KASP, CAPS, InDel, MAS, GEBV, GS}` except inside
   explicit negation patterns `not <word>-ready` or `not <word>_ready`.
   This replaces the earlier crude `git grep` acceptance.

Exit nonzero on any failure. Promote step only runs on all-green.

### 11. Generator script

New: **`scripts/generate-download-bundles.py`**.

Reads:
- `data/traits.json`, `data/cultivars.json`, `data/reference.json`,
  `data/download_versions.json`
- Firestore `orthogroup_diffs/{trait}` + the Storage diff payload if the
  doc's `storagePath` is set
- Firestore `groupings/{trait}`
- `og_gene_coords/chunk_*.json`
- `orthofinder/v{of}/og-members/chunk_*.json`
- `orthofinder/v{of}/og_descriptions.json`
- `orthofinder/v{of}/og_categories.json` (optional)
- `Orthogroups.GeneCount.tsv` for the copycount matrix

Writes to `downloads/_staging/{runId}/…` then promotes on verification
pass. Uses `functions-python/shared/` helpers (manifests, reference,
storage_paths extended with a new `downloads_path()` family).

### 12. Candidate predicate — sole owner (Condition #10)

The Python generator is **the only place** that evaluates the
candidate-selection predicate. The web UI does NOT re-run any filter.
The UI shows whatever is in `_manifest.json` and links to the static
Storage files. The prior draft's wording about "one function shared by
both sides" is retired; the correct statement is:

- Generator owns the predicate.
- UI owns display of the generator's output.
- The Explore table's filters remain interactive but have no role in
  what gets downloaded.

### 13. Storage rules + approval gate (Condition #7)

Rules diff (to append to `storage.rules`):

```
match /downloads/{path=**} {
  allow read: if true;
  allow write: if false;
}
```

**Deploy order gate**:
1. Product / security approval explicitly required — captured in the PR
   description that ships this plan, with sign-off named.
2. Files uploaded to `downloads/` (via generator) BEFORE the
   rules change is deployed. Until rules are deployed, the files are
   visible only to authenticated clients — same posture as today's
   non-public prefixes.
3. Rules deploy flips public-read on once upload is complete and
   verification has passed.
4. UI `/download` rework ships AFTER rules deploy.

This ordering prevents a window where URLs are announced but 403, and
prevents premature public exposure before verification.

### 14. UI — `/download` rework

Data source: `GET downloads/_manifest.json` via `getDownloadURL`.

Two sections added above the existing cultivar list:

- **Discovery results** — one row per trait from `data/traits.json` in
  panel order. Expandable row shows the six file links (or the three
  Tier-A links if Tier-B files are absent). Each row header shows
  `v{of}_g{g} · generated {date}` from `_manifest.json`.
- **Cross-trait master** — single expandable row with
  `cross_trait_candidates.tsv` and its README.

Each file link label shows `{name} · {humanSize}`. Clicking resolves to
the Storage download URL for that file.

Existing cultivar genome section renders below, unchanged.

## Scope — Out

- No VCF excerpt (scope exclusion)
- No standalone grouping probability CSV
- No Cloud Function auto-regen — manual generator invocation only
- No manifest / SHA256 / schema-dir "analysis bundle zip" — separate
  Tier-C plan
- No Explore "export current view" button
- No `.bed.gz.tbi` tabix index
- No change to `/data` phenotype CSV or cultivar genome downloads
- No `latest/` URL alias — `v{of}_g{g}` is mandatory in every citation
- No row-level per-cultivar probability export

## Risks

- **Scope drift to marker design** — mitigated by §10 scope-word audit
  and the locked "not marker-ready" header comments
- **"Korean rice" generalization** — mitigated by panel-scope sentence
  in every header + README
- **Stale bundle post-diff-recompute** — mitigated by the active SSOT,
  the version in the URL, and the `_manifest.json` timestamp surfaced
  in UI
- **Partial writes** — mitigated by the staging/promote pattern (§2)
- **Public-read policy shift** — mitigated by the approval gate (§13)
- **UI/generator predicate drift** — eliminated by §12 (generator is
  sole owner)

## Acceptance

Every item below is executable against the staging prefix before
promote, or against the promoted prefix after.

1. `data/download_versions.json` exists and both fields are positive
   integers; `npm run check:traits-schema` (extended) passes.
2. For the active `(of, g)`, every trait in `data/traits.json` has a
   directory under `downloads/traits/{t}/v{of}_g{g}/` containing **the
   three Tier A files** (`candidates.tsv`,
   `candidate_irgsp_coords.bed`, `candidate_copycount_matrix.tsv`) plus
   `README.md`. For `usable=false` traits, these files exist but hold
   only header comments + the schema header row — zero data rows.
   Tier B files are optional; the manifest reflects whichever files
   actually exist.
3. `cross_trait_candidates.tsv` exists under
   `downloads/cross-trait/v{of}_g{g}/` with the columns in §6. Row
   order is `(trait asc, rank asc, ogId asc)`.
4. `candidates.tsv` schema matches §4a exactly (column order, names,
   value types, null representation, enum values).
5. BED file passes `bedtools sort` and a smoke `bedtools intersect`
   against the fixture.
6. Copycount matrix has exactly `1 + pangenome_cultivar_count` columns.
7. Every TSV/BED file's first non-blank line matches `^#green_rice_db_`.
8. Every bundle directory contains a generated `README.md` from the
   shared template with all `{{variables}}` substituted.
9. Determinism: two runs with the same `(of, g)` produce byte-identical
   TSV/BED artifacts. `README.md` and `_manifest.json` may differ only
   in `generatedAt` and the `appVersion` field.
10. `downloads/_manifest.json` exists and every listed file's `sha256`
    matches the Storage object byte-for-byte.
11. `/download` UI reads ONLY `downloads/_manifest.json` +
    `data/traits.json`. The browser never reads
    `data/download_versions.json`. No Storage `list()` calls.
12. `scripts/verify-download-bundles.ts` exits zero on the staging
    prefix before promote. Promote does not run if verification fails.
    The final `downloads/_manifest.json` is written last in the promote
    step.
13. Scope-word audit (§10 rule 9) finds no violations.
14. Immutability: if the final prefix for `(of, g)` already exists,
    the generator refuses to run (no `--force` flag exists). Bumping
    version in `download_versions.json` is the only re-release path.
15. Existing cultivar genome download flow on `/download` and
    `/cultivar/:id` still functions (UI regression check — manual
    smoke, not automated in this tier).
16. `storage.rules` deploy and public-read flip happen only after
    verified files are in place.

## Open questions (resolve during implementation, not before)

1. `appVersion` source: prefer `git rev-parse --short HEAD` at
   generation time; fall back to `APP_VERSION` env when running outside
   a git checkout (e.g., CI image).
2. If `og_categories.json` is absent for the active `of`, emit
   `llmCategory=NA` everywhere — document in README.
3. BED `strand` for transcripts without strand info: `.` is valid in
   BED; use it.
4. Staging cleanup cadence if promote fails repeatedly: leave as-is for
   the first release; revisit if staging prefixes accumulate.

## Result

- Status: DONE
- Notes: Discovery download generation, verification, promotion, manifest
  loading, and `/download` UI are present in current code. Follow-up
  operational concerns should be handled through release runbooks or specific
  tech-debt entries, not this broad plan.

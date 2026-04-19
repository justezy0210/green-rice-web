# OG Region Expansion — Versioned, Trait-Split, Atomic Release

Status: active — 2026-04-19 (rev2 after Codex plan-review round 2)
Source: Codex `general-review` on the initial "세개 json 세개 만들어야지"
sketch flagged 4 contract blockers. Two `plan-review` rounds followed:
round 1 added 8 contract holes; rev1 closed them; round 2 found one
remaining blocker — candidate OG skip/emit completeness was not
expressible in the graph manifest schema. rev2 closes that with an
explicit per-OG entry for every candidate (emitted or skipped-with-
reason) + three minor cleanups. Codex verify budget spent (2/2); further
changes at lead judgement only.

## Decision

Split `og_region` into a **trait-neutral graph bundle** and a
**trait-dependent AF bundle**, both version-namespaced under
`v{of}_g{g}/`. Atomic release uses `_staging/` prefixes + final promote +
single pointer-manifest flip at `downloads/_og_region_manifest.json`. The
legacy `og_region/` stays live during the cut-over release and is
deleted only in a follow-up release (**Release B**) after observation.
`og_tubemap` stays — it's the cluster-unselected and missing-region
fallback, not an orphan.

## Why

Current layout:
```
og_region/_manifest.json   # { trait: "heading_date", ogs: {...} }  — trait field mutable
og_region/{ogId}/{cluster}.json  # anchor + liftover + graph + AF  — AF trait-baked
```

Three data-contract bugs:
1. **Trait drift** — AF baked per-cluster for one trait. Rerunning with a
   second trait silently overwrites at the same path.
2. **Version drift** — no `(of, g)` in path. Pipeline reruns overwrite.
3. **No atomic release** — `upload-og-region.ts` writes live paths file-
   by-file; UI sees mixed states mid-upload.

Expansion to 4,067 OGs × 9 traits on this contract = 9× the overwrites,
no provenance. Contract first.

## Problem

- Graph tab inactive for 4,017 / 4,067 candidates (only 50 pilot OGs
  have region data).
- Fixing coverage without fixing contract produces a worse mess.
- `og_tubemap` keeps getting touched by scope questions but is actually
  UI-critical for reference/fallback view.

## Goal

- Every candidate OG in the active `(of, g)` snapshot has a graph bundle
  (trait-neutral) and, for every **usable** trait, an AF bundle.
- Atomic release — pointer flip only after all data lands + QC passes.
- Legacy `og_region/` survives through Release A for rollback, deleted
  in Release B.
- `og_tubemap` untouched.

## Scope — In

### 0. Final path layout (LOCKED — no more Open questions here)

```
# Trait-neutral graph per cluster
og_region_graph/v{of}_g{g}/
  _manifest.json
  {og}/{cluster}.json

# Trait-specific AF per cluster (only usable traits)
og_region_af/v{of}_g{g}/
  _manifest.json                         # cross-trait summary
  {trait}/
    _manifest.json                       # per-trait counts
    {og}/{cluster}.json

# Staging — operator-only, storage.rules DENY
og_region_graph/_staging/v{of}_g{g}_{runId}/…
og_region_af/_staging/v{of}_g{g}_{runId}/…

# UI runtime pointer (LOCKED PATH — mirrors downloads/_manifest.json)
downloads/_og_region_manifest.json

# Unchanged
og_tubemap/
og_region/                               # LEGACY — kept live through Release A
```

The pointer manifest path is `downloads/_og_region_manifest.json`. This
reuses the `downloads/_*` pattern that the main downloads pipeline
already established, so the UI has exactly one "where do I find the
current view" convention.

### 1. Pointer manifest schema

```jsonc
{
  "activeOrthofinderVersion": 6,
  "activeGroupingVersion": 4,
  "generatedAt": "2026-04-19T…Z",
  "appVersion": "<git short sha>",
  "graphManifest": "og_region_graph/v6_g4/_manifest.json",
  "afManifests": {
    "heading_date": "og_region_af/v6_g4/heading_date/_manifest.json",
    "culm_length":  "og_region_af/v6_g4/culm_length/_manifest.json"
    // …only usable=true traits
  }
}
```

UI loads this ONE file, then the graph manifest, then the per-trait AF
manifest when the user picks a trait. No Storage `list()` calls ever.

### 2. Graph manifest schema (`og_region_graph/v{of}_g{g}/_manifest.json`)

```jsonc
{
  "schemaVersion": 2,
  "orthofinderVersion": 6,
  "groupingVersion": 4,
  "generatedAt": "…",
  "extractorGitSha": "…",
  "inputFingerprints": {
    "hal":   { "path": "cactus/pg.hal",    "sha256": "…", "size": … },
    "gbz":   { "path": "cactus/pg.gbz",    "sha256": "…", "size": … },
    "geneCoordsDir": { "path": "…", "contentHash": "…" },
    "candidateListSha256": "…"
  },
  "clusterCap": 5,
  "flankBp": 10000,
  "clusterThresholdBp": 25000,
  "anchorPriority": ["baegilmi", "chamdongjin", "samgwang", "…"],
  "totals": {
    "candidateOgs": 4067,
    "ogsEmitted": 4050,
    "ogsSkipped": 17,
    "clustersEmitted": 5432,
    "statusCounts": { "graph_ok": 5100, "graph_empty": 200, "graph_error": 132 },
    "skipReasonCounts": { "NO_GENE_COORDS": 12, "NO_ANCHOR_CULTIVAR": 4, "NO_CLUSTERS": 1 }
  },
  // Every candidate OG appears HERE — emitted or skipped — so manifest
  // alone is sufficient to reconstruct completeness.
  "ogs": {
    "OG0000987": {
      "status": "emitted",
      "anchorCultivar": "baegilmi",
      "truncated": false,
      "clusters": [
        { "clusterId": "baegilmi_chr06_9755166",
          "chr": "chr06", "start": 9755166, "end": 9755763,
          "geneCount": 1, "kind": "singleton",
          "graphStatus": "ok" }
      ]
    },
    "OG0041042": {
      "status": "skipped",
      "skipReason": "NO_GENE_COORDS",
      "clusters": []
    }
  }
}
```

`status` (per-OG) ∈ `{emitted, skipped}`.
`skipReason` ∈ `{NO_GENE_COORDS, NO_ANCHOR_CULTIVAR, NO_CLUSTERS,
EXTRACTOR_ERROR}` — enum; any reason outside this set is a validator
failure.

`groupingVersion` is bound into the graph manifest even though the
graph body itself is trait-neutral — the **candidate universe** is
defined by the usable-trait set, which is a `(of, g)` product.

Per-cluster entries carry ONLY what the UI badge / picker needs —
status, clusterId, chr/start/end, kind. Full graph body lives in the
per-cluster JSON.

### 3. AF manifest schema (`og_region_af/v{of}_g{g}/{trait}/_manifest.json`)

```jsonc
{
  "schemaVersion": 2,
  "orthofinderVersion": 6,
  "groupingVersion": 4,
  "trait": "heading_date",
  "usable": true,
  "groupLabels": ["early", "late"],
  "generatedAt": "…",
  "extractorGitSha": "…",
  "inputFingerprints": { "vcf": {…}, "groupingsDocVersion": 4 },
  "totals": {
    "ogsEmitted": 4050,
    "clustersEmitted": 5432,
    "statusCounts": { "af_ok": 4800, "af_no_variants": 400,
                      "af_unmapped": 200, "af_error": 32 }
  },
  "ogs": { "OG…": { "clusters": [ { "clusterId": "…", "afStatus": "ok",
                                    "variantCount": 329 } ] } }
}
```

### 4. AF trait selection rule (LOCKED)

AF bundles are generated for every trait in the intersection of:
- `data/traits.json` entries, AND
- Firestore `groupings/{trait}.quality.usable === true`

Traits present in `traits.json` but `usable=false` get **no** AF
bundle and do not appear under `afManifests` in the pointer. The
graph bundle is independent — every candidate OG cluster emits its
graph JSON regardless of any trait.

### 5. Per-cluster graph JSON (`og_region_graph/…/{og}/{cluster}.json`)

```jsonc
{
  "schemaVersion": 2,
  "ogId": "OG0000987",
  "clusterId": "baegilmi_chr06_9755166",
  "orthofinderVersion": 6,
  "source": "cultivar-anchor",
  "anchor": { "cultivar": …, "kind": …, "genes": […], "regionSpan": …, "flankBp": … },
  "liftover": { "status": "mapped|partial|unmapped|multimap", "irgspRegion": …, "coverage": 0.87 },
  "graph": { "nodes": […], "edges": […], "paths": […] } | null,
  "status": {
    "graph": "ok|empty|error",
    "reasonCode": "OK|NO_COHORT|VG_CHUNK_EMPTY|LIFT_FAIL",
    "errorMessage": "…(optional debug string; UI uses reasonCode for branching)"
  }
}
```

### 6. Per-cluster AF JSON (`og_region_af/…/{trait}/{og}/{cluster}.json`)

```jsonc
{
  "schemaVersion": 2,
  "ogId": "OG0000987",
  "clusterId": "baegilmi_chr06_9755166",
  "trait": "heading_date",
  "orthofinderVersion": 6,
  "groupingVersion": 4,
  "groupLabels": ["early", "late"],
  "variants": […],
  "status": { "af": "ok|no_variants|unmapped|error",
              "reasonCode": "OK|NO_VARIANTS|COVERAGE_TOO_LOW|VCF_FAIL" }
}
```

### 7. Cluster coverage contract (UNCHANGED; now documented)

One anchor cultivar per OG (priority order recorded in manifest),
`--cluster-cap=5`, `--flank=10000`, `--cluster-threshold=25000`. These
values are bound into the manifest so future debugging can reason about
why a cluster is missing or truncated.

### 8. Scope universe

Active `(of, g)` candidate universe = dedupe of
`orthogroup_diffs/*.entries[*].orthogroup` for every trait with
`usable=true`. Measured 4,067 OGs. Not the full 53,539 — scope drift
per scope.md.

### 9. Server-side extraction (`scripts/batch-region-extract.py` refactor)

Behavior changes:
- `--og-list <one-per-line>` replaces `--candidates <tsv>`.
- `--trait` dropped. `--groupings <all.json>` now carries every usable
  trait's `groupLabels` + `groupMembers`; extractor iterates those.
- `--of N --g M` required. Both version fields baked into every emitted
  JSON and both manifests.
- Writes locally to
  `<output>/og_region_graph/v{of}_g{g}_{runId}/…` and
  `<output>/og_region_af/v{of}_g{g}_{runId}/…`. Local staging mirror of
  downloads — Firebase `_staging/` prefix is a policy-backed safety net
  but primary staging is the local filesystem.
- Input fingerprints computed (sha256 for hal/gbz/vcf, content hash for
  gene-coords dir tree, candidate list sha256) and written into both
  manifests.
- Emits one graph JSON per (ogId, clusterId). Emits one AF JSON per
  (trait, ogId, clusterId) using per-trait group_members.

### 10. Input production (explicit pipeline)

1. **Local pre-step** `scripts/prepare-og-region-inputs.py`:
   - Reads Firestore `_orthofinder_meta.state.activeVersion` and
     `groupings/*.summary.version`; confirms the SSOT `(of, g)` matches
     `data/download_versions.json`.
   - Dedupes candidate OGs from Storage diff payloads across all usable
     traits. Writes `/tmp/candidate_ogs.txt` + `/tmp/groupings_all.json`.
   - Computes sha256 for both files.
2. scp those two files + current extractor to the remote server.
3. Run extractor on remote. Outputs to `/tmp/og_region_out/`.
4. Local validator (§11).
5. `scripts/promote-og-region.py` uploads + flips pointer.

### 11. Pre-promote validator (`scripts/verify-og-region-bundle.ts`)

Required checks before promote:
- **Completeness**: `graph manifest.ogs` keys ⊇ candidate list. Every
  candidate OG has `status ∈ {emitted, skipped}`. `ogsEmitted +
  ogsSkipped == candidateOgs`.
- **Skip reasons**: every skipped OG has a `skipReason` in the enum.
- **Status count integrity**: `totals.statusCounts.*` sum equals
  `clustersEmitted` on graph manifest and on each per-trait AF
  manifest.
- **Skip reason counts**: `skipReasonCounts` sum equals `ogsSkipped`.
- **AF trait set**: every usable trait has an AF manifest; unusable
  traits have none.
- **Subset**: per-trait AF OG set ⊆ graph-manifest emitted OG set;
  per-trait AF cluster set ⊆ graph-manifest cluster set (per OG).
- **Version echo**: per-cluster JSON `orthofinderVersion` (and
  `groupingVersion` on AF) matches the manifest body.
- **Input fingerprints identity**: sha256 of every input fingerprint
  equal across graph manifest and all AF manifests.
- **No orphans**: zero per-cluster JSONs without a manifest entry; zero
  manifest entries without a file (for emitted OGs).

### 11a. Cross-trait AF summary manifest (`og_region_af/v{of}_g{g}/_manifest.json`)

Role: a compact readable summary of which traits have AF coverage at
this `(of, g)`. Consumed by operators + release records, NOT by the
UI (UI reads the pointer + per-trait AF manifests directly). Schema:

```jsonc
{
  "schemaVersion": 2,
  "orthofinderVersion": 6,
  "groupingVersion": 4,
  "generatedAt": "…",
  "traits": {
    "heading_date": { "usable": true, "ogsEmitted": 4050, "clustersEmitted": 5432 },
    "culm_length":  { "usable": true, "ogsEmitted": 4050, "clustersEmitted": 5432 }
    // unusable traits absent
  }
}
```

Validator checks this file's `traits` set equals the pointer
manifest's `afManifests` key set.

### 12. Promote (`scripts/promote-og-region.py`)

Order — each step atomic; failure aborts:
1. **Pre-flight** — every final prefix
   (`og_region_graph/v{of}_g{g}/` + `og_region_af/v{of}_g{g}/`) must be
   empty. Refuse with actionable error otherwise.
2. Validator re-run on local staging. Refuse on any failure.
3. Upload per-cluster graph JSONs with `if_generation_match=0`.
4. Upload per-cluster AF JSONs with `if_generation_match=0`.
5. Upload `og_region_graph/v{of}_g{g}/_manifest.json` and per-trait AF
   `_manifest.json` files.
6. Upload `og_region_af/v{of}_g{g}/_manifest.json` (cross-trait summary).
7. **Pointer flip** — overwrite `downloads/_og_region_manifest.json`.
   This is the ONE file allowed to overwrite.
8. Post-promote smoke — fetch pointer + graph manifest + one AF manifest
   + one per-cluster graph + one per-cluster AF via public URL. All
   return 200.

### 13. Rollback

**Prerequisite:** rollback-by-pointer-replay requires that the prior
release's record file (`docs/releases/og-region-v{prev}.md` with the
verbatim pointer body) is committed. §14 makes that commit mandatory —
if it hasn't been committed, rollback is blind and unsafe.

- Steps 1-6 fail → staging stays, final prefixes untouched, old pointer
  still valid. No rollback action needed.
- Step 7 succeeds but step 8 fails → re-upload the previous pointer
  manifest body (copy from `docs/releases/og-region-v{prev}.md`) to
  `downloads/_og_region_manifest.json`. Old final prefixes remain live
  as long as Release B hasn't happened, so the pointer points back
  cleanly.
- After Release B (legacy delete), rollback-by-pointer still works
  because final prefixes for old versioned `(of, g)` snapshots remain —
  Release B deletes only the legacy `og_region/**` path, not prior
  versioned snapshots.

### 14. Release recording

Each promote writes a record to `docs/releases/og-region-v{of}_g{g}.md`
with: input fingerprints, manifest counts, extractor git sha, pointer
manifest body verbatim, generated timestamp, operator. Committed in a
post-promote follow-up.

### 15. UI cutover (Release A)

- `useOgRegionManifest` → `useOgRegionPointer` reads
  `downloads/_og_region_manifest.json`, then fetches graph manifest
  + per-trait AF manifest.
- `useOgRegion(ogId, clusterId)` → `useOgRegionGraph(ogId, clusterId)`
  (trait-agnostic).
- New `useOgRegionAf(ogId, clusterId, traitId)`.
- `OgDetailGraphTab` + `OgDrawer` consume graph hook.
  `OgDetailAlleleFreqTab` + AF components consume AF hook.
- **Dual-read fallback**: if pointer manifest fetch fails with 404,
  fall back to reading legacy `og_region/_manifest.json` for the
  window between Release A code deploy and pointer promote. Removed
  in Release B.

### 16. `og_tubemap` fallback matrix (LOCKED)

| Condition | Graph tab renders |
|---|---|
| No cluster selected (reference view) | `og_tubemap/{og}.json` |
| Selected cluster is IRGSP reference pseudo-cluster | `og_tubemap/{og}.json` |
| Cluster graph JSON present, `status.graph === "ok"` | new graph bundle |
| Cluster graph JSON present, `status.graph === "empty"` | empty-state caveat + `og_tubemap` if available |
| Cluster graph JSON present, `status.graph === "error"` | error caveat (using `reasonCode`), no graph body |
| No cluster graph JSON at all (not in manifest) | "region missing" caveat + `og_tubemap` if available |

Badge semantic: `OgDrawer.Graph badge = active` iff at least one
cluster for the OG has `graphStatus === "ok"` in the graph manifest.
Codified in acceptance.

### 17. Release B (separate PR, ≥1 week after Release A promote)

- Delete legacy `og_region/**`.
- Remove dual-read fallback from `useOgRegionPointer`.
- Deprecate `upload-og-region.ts` + `og_region/_manifest.json` schema
  docs.

## Scope — Out

- Cluster coverage expansion beyond anchor-1 + cap-5.
- Coverage beyond the active `(of, g)` candidate universe.
- Retiring `og_tubemap`. Stays as the reference/default view source.
- Exposing graph/AF bundles as user downloads. UI-only; `/download` page
  unchanged.
- Compressing JSON (gzip). Revisit if object count / byte size hurts.
- Content-Disposition on graph/AF — fetched programmatically by the UI,
  never exposed as clickable download links.

## Risks

- **Pointer flip before UI deploy** — UI would read legacy until refresh.
  Mitigated by dual-read fallback in §15 during Release A.
- **Promote duration** — ~10k uploads. Sequential is the house pattern;
  thread-pool is a future optimization.
- **Inputs mutate mid-extraction** — fingerprints in manifest let the
  validator detect.
- **Scope drift via bulk-browse** — explicit `Scope — Out` clause.

## Acceptance

1. `data/download_versions.json` active pair matches the `(of, g)` in
   the pointer manifest.
2. `downloads/_og_region_manifest.json` exists, returns 200 publicly,
   parses to the schema in §1.
3. Graph manifest `totals.candidateOgs` equals the SSOT candidate
   universe size (currently 4,067).
4. Graph manifest `totals.statusCounts.{graph_ok,graph_empty,graph_error}`
   sums to `totals.clustersEmitted`.
4a. **Skip completeness**: every candidate OG appears in
    `graph manifest.ogs` with `status ∈ {emitted, skipped}`.
    `ogsEmitted + ogsSkipped == candidateOgs`. Every skipped OG has a
    `skipReason` in the enum
    `{NO_GENE_COORDS, NO_ANCHOR_CULTIVAR, NO_CLUSTERS, EXTRACTOR_ERROR}`.
    `skipReasonCounts` sums to `ogsSkipped`.
5. For every usable trait in `data/traits.json`, `afManifests[trait]`
   exists in the pointer manifest and the referenced manifest exists
   at `og_region_af/v{of}_g{g}/{trait}/_manifest.json`.
6. For every unusable trait, `afManifests` has no entry.
7. Per-trait AF manifest `ogsEmitted` ≤ graph manifest `ogsEmitted`.
8. Input fingerprint sha256 values in graph manifest equal the values
   in every AF manifest.
9. Every emitted cluster JSON carries `orthofinderVersion` (and AF
   files carry `groupingVersion`). Schema = 2.
10. `og_tubemap/*` object count and sha256s unchanged across the
    release.
11. `OgDrawer.Graph badge` active for any candidate OG with at least
    one cluster `graphStatus="ok"` in the graph manifest.
12. `scripts/verify-og-region-bundle.ts` exits 0 against the staging
    directory before promote runs.
13. Post-promote smoke (§12 step 8): pointer + graph manifest + one AF
    manifest + one per-cluster graph + one per-cluster AF all fetch 200.
14. `docs/releases/og-region-v{of}_g{g}.md` committed within 24h of
    promote.
15. Manual sanity: `/explore?trait={t}&og={og}` renders Graph and AF
    tabs with real data for one OG per usable trait.
16. Dual-read fallback confirmed: temporarily renaming
    `downloads/_og_region_manifest.json` falls back to legacy manifest
    without Graph-tab regression.

## Open questions (non-blocking, resolve during impl)

1. Promote concurrency: sequential (default) vs thread-pool. Affects
   operator time only.
2. Whether to preserve the legacy `og_region/_manifest.json.trait`
   field as a debug artifact during Release A. Default: drop; nothing
   reads it.
3. Whether AF `variants[]` should be truncated for very rich clusters
   to keep JSON size down. Default: no truncation; revisit if any
   cluster JSON exceeds 1 MB.

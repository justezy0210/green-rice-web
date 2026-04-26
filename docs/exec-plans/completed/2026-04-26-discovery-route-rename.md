# [PLAN] Rename Analysis module to Discovery

## Goal

Rename the user-facing analysis module from **Analysis** to **Discovery** and
move its route namespace from `/analysis` to `/discovery` without keeping a
compatibility alias.

The `/discovery` page should become the meaningful data summary surface for
candidate-discovery results, not just a run picker.

## Decisions

1. **No URL alias.** Remove `/analysis` routes instead of redirecting them.
   Any internal app link must point to `/discovery`.
2. **User-facing name:** use `Discovery` in the top nav and page title.
   Use `Candidate Discovery` or `Discovery dashboard` inside the page where
   more context is useful.
3. **Data model name stays for now.** Keep Firestore/Storage identifiers such
   as `analysis_runs` and TypeScript domain names like `AnalysisRun` unless a
   later backend migration is explicitly planned. This pass changes route/UI
   ownership, not stored collection names.
4. **Entity-first scope remains.** Discovery is a secondary module that
   summarises candidate evidence and links back into canonical entity pages.
5. **Representative runs only for dashboard totals.** Current Firestore data
   includes older `*_sv0_gm11_sc0` and current `*_sv1_gm11_sc1` runs for the
   same traits. Discovery home totals must not double-count both generations.
   Use the current promoted run generation (`svReleaseId = sv_v1`,
   `intersectionReleaseId = int_v1`, `scoringVersion = 1`) for headline
   totals and review queues, while still allowing direct links to older runs if
   an existing detail URL is opened.

## Observed data baseline

Read-only Firestore check on 2026-04-26:

- `analysis_runs`: 18 docs total.
- There are 9 traits, each with an older `sv0/sc0` run and a current `sv1/sc1`
  run.
- Summing all 18 docs gives `10,392` candidates, but this double-counts the
  same traits across run generations.
- Current `sv1/sc1` representative total: `5,196` candidates across 9 traits.
- Current `sv1/sc1` review blocks: `25` total.
- Current runs with review blocks:
  - `heading_date`: `1,045` candidates, `7` blocks.
  - `culm_length`: `859` candidates, `7` blocks.
  - `bacterial_leaf_blight`: `532` candidates, `6` blocks.
  - `spikelets_per_panicle`: `608` candidates, `5` blocks.
- Current runs without review blocks:
  - `grain_weight`: `458` candidates.
  - `panicle_length`: `1,026` candidates.
  - `panicle_number`: `179` candidates, `9` samples.
  - `pre_harvest_sprouting`: `177` candidates, `7` samples.
  - `ripening_rate`: `312` candidates.
- Strong curated/review blocks currently present:
  - shared `chr11 21-25 Mb` development block in `heading_date`
    (`110` candidate OGs, `486` intersections), `culm_length`
    (`126`, `533`), and `spikelets_per_panicle` (`137`, `611`).
  - shared `chr06 9-11 Mb` heading/development block in `heading_date`
    (`55`, `240`) and `culm_length` (`49`, `236`).
  - `chr11 27-29 Mb` bacterial leaf blight resistance block (`31`, `112`).
- `stepAvailability` exists on current run docs; all five steps are `ready`
  for current `sv1/sc1` runs. Older `sv0/sc0` docs have intersections disabled
  and no block fields.

## Scope

### Route namespace

Replace every active route:

- `/analysis` -> `/discovery`
- `/analysis/:runId` -> `/discovery/:runId`
- `/analysis/:runId/phenotype` -> `/discovery/:runId/phenotype`
- `/analysis/:runId/orthogroups` -> `/discovery/:runId/orthogroups`
- `/analysis/:runId/variants` -> `/discovery/:runId/variants`
- `/analysis/:runId/intersections` -> `/discovery/:runId/intersections`
- `/analysis/:runId/candidates` -> `/discovery/:runId/candidates`
- `/analysis/:runId/candidate/:candidateId` -> `/discovery/:runId/candidate/:candidateId`
- `/analysis/:runId/blocks` -> `/discovery/:runId/blocks`
- `/analysis/:runId/block/:blockId` -> `/discovery/:runId/block/:blockId`

Do not leave a `<Navigate from="/analysis" ...>` route.

### User-facing copy

Replace user-facing module labels:

- Header nav: `Analysis` -> `Discovery`
- Dashboard card: `Analysis` -> `Discovery`
- Discovery home H1/title
- Empty states and helper links that mention `/analysis`
- Entity backlink panels that say "analysis" where "discovery run" is the
  better user-facing phrase

Keep technical backend copy only when it refers to a real backend object,
script, or collection name.

### Meaningful data dashboard

Redesign `/discovery` home around data summaries:

1. **Discovery snapshot**
   - number of ready representative runs (`9`)
   - total candidates from representative runs only (`5,196`)
   - total review blocks from representative runs only (`25`)
   - trait coverage (`9` traits; show 4 with blocks / 5 candidate-only)
   - active sample/version summary where available

2. **Trait run overview**
   - trait label
   - run status
   - sample count
   - candidate count
   - block count
   - explicit visual state for `0` review blocks so candidate-only traits do
     not look broken
   - ready step badges
   - primary action: `Open discovery`
   - secondary actions: `Candidates`, `Review blocks`

3. **Review queue**
   - replace hardcoded `CURATED_HIGHLIGHTS`
   - derive rows from actual run/block data where available
   - prioritize curated blocks, shared blocks, and blocks with high candidate
     or intersection counts
   - should naturally surface the three current strong regions:
     `chr11 21-25 Mb`, `chr06 9-11 Mb`, and `chr11 27-29 Mb`
   - each row links to `/discovery/:runId/block/:blockId`

4. **Evidence coverage**
   - show 5-step readiness across runs using the existing step availability
     state
   - do not fetch full OG diff payloads just to decorate the home page

### Visualizations

Use visualizations only where they clarify the candidate-discovery result. The
goal is fast interpretation, not decorative chart density. Existing
dependencies already include `chart.js` / `react-chartjs-2`, and the app has
SVG-based region visualization patterns, so do not add a new visualization
library in this pass.

1. **Trait candidate/block distribution**
   - horizontal bar chart or dense paired bars
   - compare representative-run `candidateCount` and `blockCount` by trait
   - make candidate-only traits explicit instead of visually implying missing
     data
   - useful examples from current data: `heading_date` (`1,045` candidates,
     `7` blocks), `panicle_length` (`1,026`, `0`), `culm_length` (`859`, `7`)

2. **Review locus map**
   - compact chromosome-lane view for the review blocks currently present
   - prioritize the high-signal chromosomes/regions: `chr11 21-25 Mb`,
     `chr06 9-11 Mb`, `chr11 27-29 Mb`, plus `chr04 7-8 Mb` where relevant
   - show trait association on each block marker so repeated loci across
     traits are visible
   - this should be the primary visual summary on `/discovery`

3. **Evidence readiness matrix**
   - rows: representative trait runs
   - columns: phenotype, orthogroups, variants, intersections, candidates
   - use compact ready/pending/disabled cells instead of a large chart
   - current representative `sv1/sc1` runs should all show five ready steps;
     older direct-linked `sv0/sc0` runs may still show disabled intersections

4. **Review queue mini bars**
   - inside each review-block row, show small inline bars for
     `candidateOgCount` and `intersectionCount`
   - keep the numbers visible; bars are a relative scan aid only
   - examples to surface clearly: shared `chr11 21-25 Mb` development block,
     shared `chr06 9-11 Mb` heading/development block, and `chr11 27-29 Mb`
     bacterial leaf blight block

Defer complex network graphs, genome-browser-style exploration, or causal
pathway visualizations until there is more validated evidence. They would add
interaction cost without improving the current candidate-discovery summary.

### Internal links to update

Update links in at least these areas:

- `src/App.tsx`
- `src/components/layout/Header.tsx`
- `src/components/dashboard/EntityCardsGrid.tsx`
- `src/pages/AnalysisHomePage.tsx`
- `src/pages/AnalysisRunPage.tsx`
- all `src/pages/AnalysisStep*.tsx`
- `src/pages/AnalysisBlockListPage.tsx`
- `src/pages/AnalysisBlockDetailPage.tsx`
- `src/pages/CandidateDetailPage.tsx`
- `src/pages/OgDetailPage.tsx`
- `src/pages/RegionPage.tsx`
- `src/pages/OrthogroupIndexPage.tsx`
- `src/components/analysis/*`
- `src/components/entity/*`
- `src/components/og-detail/*`
- `src/components/download/*`
- `src/components/region/*`
- `src/components/badges/TraitHitBadge.tsx`
- product/docs references where the route is described as user-facing

Search patterns:

```bash
rg -n '"/analysis|`/analysis|to="/analysis|pathname\\.startsWith\\('/analysis|Analysis\\b' src docs README.md
```

Then verify no active user-facing `/analysis` link remains.

## Possible file renames

Optional but preferred if it reduces confusion:

- `AnalysisHomePage.tsx` -> `DiscoveryHomePage.tsx`
- `AnalysisRunPage.tsx` -> `DiscoveryRunPage.tsx`
- `AnalysisShell.tsx` -> `DiscoveryShell.tsx`
- `AnalysisRunRow.tsx` -> `DiscoveryRunRow.tsx`

Do not rename every `Analysis*` domain type blindly. `AnalysisRun` can remain
the backend domain concept while the UI module is named Discovery.

## Non-goals

- No Firestore collection migration from `analysis_runs`.
- No Storage path migration for existing analysis run artifacts.
- No runId format change.
- No backend script rename in this pass unless a user-facing route string is
  embedded in generated output.
- No `/analysis` backward compatibility alias.

## Risks / Open questions

- **External bookmarks break.** This is intentional per the no-alias decision.
- **Docs may still use "analysis" generically.** Only user-facing route/module
  references must be changed. Technical references to analysis runs can remain.
- **Review queue needs data access.** Current hooks list runs and blocks per run.
  A first pass can fetch top blocks per visible run client-side; a later
  denormalized index can improve performance if needed.
- **Run generation filtering matters.** Listing every `analysis_runs` doc will
  double-count candidates because current Firestore has both `sv0/sc0` and
  `sv1/sc1` documents per trait.
- **Terminology overlap.** `Discovery` must not imply validated findings. Keep
  scope copy: candidate evidence, not causal, not marker-ready.

## Verification

- [x] `rg -n '"/analysis|`/analysis|to="/analysis|pathname\\.startsWith\\('/analysis' src README.md docs/product-specs docs/references` returns no active user-facing route hits.
- [x] `npm run type-check`
- [x] `npm run lint`
- [x] `npm run check:arch`
- [x] `npm run build`
- [x] Route table smoke targets present in `src/App.tsx`:
  - `/discovery`
  - `/discovery/:runId`
  - `/discovery/:runId/orthogroups`
  - `/discovery/:runId/candidates`
  - `/discovery/:runId/blocks`
  - `/discovery/:runId/block/:blockId`
- [x] Confirm `/analysis` no longer resolves inside `src/App.tsx`.

## Result

- Status: completed on 2026-04-26.
- Notes:
  - Replaced user-facing `/analysis` namespace with `/discovery`; no alias or
    redirect for `/analysis` remains.
  - Renamed route-bound pages and UI components to Discovery terminology while
    keeping backend identifiers such as `analysis_runs`, `AnalysisRun`, and
    storage paths intact.
  - Rebuilt `/discovery` home into a candidate-discovery dashboard with
    representative-run filtering, snapshot totals, trait candidate/block
    distribution, review locus map, review queue mini bars, and evidence
    readiness matrix.
  - Updated entity/download/header/dashboard links and current product/design
    docs to the Discovery route and terminology.
  - Existing dev server was already running per user; no new server was kept
    running by this implementation pass.

# Tech Debt Tracker

Known technical debt and improvement opportunities.

## Active

| ID | Area | Description | Priority | Added |
|----|------|-------------|----------|-------|
| TD-001 | components | PhenotypeDistributionChart has mixed concerns (URL state, sorting, chart selection, navigation) | Medium | 2026-04-14 |
| TD-002 | types | Some type definitions could be more strict (excessive `null` unions) | Low | 2026-04-14 |
| TD-003 | scripts | REF_GENOME / GBZ_REF_SAMPLE / ANCHOR_PRIORITY / flank / cluster-threshold / cluster-cap hardcoded in batch-region-extract.py — move to config file (`configs/batch/{ref}.json`) | Medium | 2026-04-18 |
| TD-004 | scripts | `--trait heading_date` default in batch + select scripts — make required once multi-trait batching starts | Medium | 2026-04-18 |
| TD-005 | scripts/types | og_region path literals (`og_region/...`) repeated across og-region-service.ts — consolidate into src/lib/og-storage-paths.ts | Low | 2026-04-18 |
| TD-006 | scripts | Other Python scripts (build-gene-coords.py, generate-metadata.py) still carry their own CULTIVARS list — migrate to scripts/_cultivars.py when next touched | Low | 2026-04-18 |
| TD-007 | components | TubeMapRenderer lacks true bubble-stacked layout: sibling alt nodes render linearly after ref anchor instead of stacked at same x. Full sequencetubemap-style layout deferred (see Codex verify 2026-04-18). Options: A) port vgteam/sequencetubemap core, B) implement UPGMA-compatible bubble stacking | Medium | 2026-04-18 |
| TD-008 | components | TubeMapRenderer "expand-on-demand" for shared blocks (click to reveal internal nodes) not implemented — merged block shows only aggregate kb/count. Needed for bubble-internal variant inspection | Low | 2026-04-18 |
| TD-009 | types/services | IRGSP reference cluster is a pseudo-cluster that reuses OG-level `afSummary` and `og_tubemap` instead of per-cluster `og_region/irgsp_*.json`. Keep branching explicit via `GeneCluster.source`. Promote to real pipeline (batch-region-extract.py with IRGSP anchor) if IRGSP becomes a primary workflow. | Medium | 2026-04-18 |

## Resolved

| ID | Area | Description | Resolved | Notes |
|----|------|-------------|----------|-------|
| TD-R001 | types | Runtime functions in src/types/ (emptyCultivarForm, etc.) | 2026-04-14 | Moved to src/lib/*-helpers.ts |
| TD-R002 | pages | CultivarDetailPage.tsx exceeded 300-line limit (388 lines) | 2026-04-14 | Split into GenomeRadarSection, GenomeTableSection, MiniSearch |
| TD-R003 | lib | Firebase calls missing try-catch error handling | 2026-04-14 | Added try-catch to all service functions |
| TD-R004 | admin | GenomeUploadPanel not connected to AdminPage | 2026-04-14 | Wired into edit mode |
| TD-R005 | hooks | usePhenotypeData cache could not be invalidated | 2026-04-15 | Added `invalidateCache()` + `refresh()` |
| TD-R006 | types | cultivarId was not exposed in PhenotypeRecord | 2026-04-15 | Added `cultivarId` field for grouping join |

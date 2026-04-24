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
| TD-011 | scripts | `build-per-cultivar-sv-coords.py` still reads only ALT0 from the sample VCF for the (now-dropped) `is_sv` filter. Currently the ALT0-vs-REF length check is bypassed — we trust the canonical join — so multi-allelic carriers are preserved. If a future change re-introduces a per-row SV reclassification, iterate over every ALT allele and pick the one matching the sample's canonical `gts` index. | Low | 2026-04-23 |
| TD-012 | scripts | `build-per-cultivar-sv-coords.py` silently overwrites on duplicate `originalId`, silently drops `canon is None` mismatches (52 observed / run), and has no machine-readable audit manifest (vg version, input GBZ/snarl checksums, per-sample drop reasons). Upgrade to fail-on-threshold + structured manifest. | Low | 2026-04-23 |
| TD-013 | scripts | `build-sv-matrix.py` dry-run writes raw JSON with `.json.gz` suffix (not actually gzipped); side-table script added a magic-byte sniff as a workaround. Fix upstream so dry-run writes real gzip. Also its `--dry-run` still requires Firebase init and grouping fetch. | Low | 2026-04-23 |
| TD-014 | scripts | Per-cultivar pipeline's `PanSN` parser assumes `sample#hap#chr` only, so reference subrange (`chr01[123]`) and future path metadata formats break silently. Hardening needed when GBZ path layout changes. | Low | 2026-04-23 |
| TD-015 | docs | `docs/references/data-pipelines.md` missing a `build-per-cultivar-sv-coords` entry; vg version + input checksums + exact command list are not captured anywhere, so the current release is not reproducibly re-runnable by another operator. | Medium | 2026-04-23 |
| TD-016 | hooks | `useSvCultivarCoords.available = entries.length > 0` conflates "side-table file missing" with "legitimately empty bundle (0 ALT carriers on chr)". Emit empty bundles from the script into Storage and flip to `available = !!bundle` so the two cases are distinguishable, or add an explicit per-release manifest listing cultivars with coords. | Low | 2026-04-23 |
| TD-017 | types/lib | `og-conservation` currently relies on a one-shot `orthofinder/v{N}/_conservation.json.gz` bundle (~200 KB gzipped) that the client fetches and indexes in memory. Works fine for 50 k OGs × 12 cultivars today, but as panel grows (16+) or filter/search surfaces are added, move conservation tier/presence into a server-side materialised summary (e.g. alongside `orthogroup_diffs/` or as a separate `og_conservation` collection) so individual OG/gene pages don't even need the whole bundle. | Medium | 2026-04-24 |
| TD-018 | components | OG detail page should reuse the new `ConservationSummary` card (currently only Gene detail consumes it). Cheap add once OG detail is refactored; keeps the conservation tier language consistent across entity surfaces. | Low | 2026-04-24 |
| TD-019 | scripts | `_conservation.json.gz` is built ad-hoc from `data/Orthogroups.GeneCount.tsv` via a one-off upload command in the session transcript. Promote to a proper `scripts/build-og-conservation.py` with `--dry-run`, manifest, version gating — same pattern as `build-per-cultivar-sv-coords.py`. Makes re-release reproducible. | Medium | 2026-04-24 |

## Resolved

| ID | Area | Description | Resolved | Notes |
|----|------|-------------|----------|-------|
| TD-R001 | types | Runtime functions in src/types/ (emptyCultivarForm, etc.) | 2026-04-14 | Moved to src/lib/*-helpers.ts |
| TD-R002 | pages | CultivarDetailPage.tsx exceeded 300-line limit (388 lines) | 2026-04-14 | Split into GenomeRadarSection, GenomeTableSection, MiniSearch |
| TD-R003 | lib | Firebase calls missing try-catch error handling | 2026-04-14 | Added try-catch to all service functions |
| TD-R004 | admin | GenomeUploadPanel not connected to AdminPage | 2026-04-14 | Wired into edit mode |
| TD-R005 | hooks | usePhenotypeData cache could not be invalidated | 2026-04-15 | Added `invalidateCache()` + `refresh()` |
| TD-R006 | types | cultivarId was not exposed in PhenotypeRecord | 2026-04-15 | Added `cultivarId` field for grouping join |
| TD-R007 | scripts/types | Per-cultivar SV side-table lacked sample-frame allele-aware rendering (TD-010) | 2026-04-23 | Realised schema was sufficient; rendering fixed in `GeneModelSvg` with canonical-svType-aware glyphs (INS span, DEL breakpoint, COMPLEX hatched span) interpreted against sample-frame `refLen`. Script also simplified to drop is_sv re-check; canonical join is now the sole correctness gate. Side-tables re-uploaded (~+300-500 entries/cultivar picked up multi-allelic carriers). |

# Green Rice Web — Progress

## Phase 1: MVP (DONE)
- [x] Project structure design
- [x] Type definitions (phenotype, genotype, common)
- [x] CSV-based data service
- [x] Page implementation (Dashboard, DataTable, Comparison, Login)
- [x] Chart components (Bar, Scatter, Distribution, Heatmap)
- [x] Auth context and hooks

## Phase 2: Firebase (DONE)
- [x] Firebase project setup (green-rice-db)
- [x] .env configuration and connection
- [x] Firestore database creation
- [x] Firestore security rules (public read, authenticated write)
- [x] CSV → Firestore data migration (11 cultivars)
- [x] data-service.ts switched to Firestore
- [x] Auth provider setup and test (Email/Password, Google)

## Phase 6: Orthogroup → Gene Drilldown (DONE — code complete)
- [x] Streaming parser (`iter_orthogroups_rows`)
- [x] StreamingChunkWriter (memory-bounded chunking by 1000-OG boundary)
- [x] Baegilmi gene annotation snapshot as versioned artifact
- [x] Pre-commit vs post-commit orphan cleanup policy
- [x] Storage rules recursive match (`orthofinder/v{N}/{path=**}`)
- [x] pytest fixtures (parser + chunker, 12 tests)
- [x] Frontend service + hook (resolved-data cache, AbortController)
- [x] OgDrawer with a11y (focus trap, ESC, scroll lock, focus restore)
- [x] ExplorePage `?trait=&og=` URL contract
- [x] First-cell button for keyboard accessibility
- [x] Storage artifacts documented (`docs/generated/orthofinder-artifacts.md`)
- [ ] Deployment (`firebase deploy --only functions:grouping,storage:rules`)
- [ ] Admin re-uploads TSVs to generate v{N}/ with new chunks + annotation
- [ ] End-to-end verify: click OG → drawer opens with gene members

## Phase 5: Orthogroup Differential Analysis (DONE — code complete, deploy pending)
- [x] Shared types (TS + Python dataclass mirror)
- [x] OrthoFinder TSV parser (strip `_longest` suffix, extract baegilmi gene members)
- [x] Temporary baegilmi GFF3 annotation lookup
- [x] Diff computation with 3 metrics (mean diff, presence diff, log2 FC)
- [x] Python callable `start_orthofinder_processing` (admin-only)
- [x] Lease-based lock + atomic staging→v{N} commit
- [x] Integration with `on_cultivar_change` (diff runs inside grouping lock)
- [x] Admin upload panel + admin claim hook
- [x] Firestore/Storage rules with admin claim check
- [x] `scripts/grant-admin.cjs` bootstrap script
- [x] `/explore` page with TraitSelector + GroupingSummaryCard + OrthogroupDiffTable
- [x] Dashboard "Explore candidates →" link
- [ ] Deployment (`firebase deploy --only functions:grouping,firestore:rules,storage:rules`)
- [ ] Run grant-admin script for owner account
- [ ] End-to-end test: upload TSVs → diffs appear on /explore

## Phase 4: Auto-Grouping Pipeline (DONE)
- [x] Types + trait metadata (`src/types/grouping.ts`, Python dataclass)
- [x] Python grouping engine (quality_check, preprocess, gmm_cluster, fixed_class, post_process, orchestrator)
- [x] Firestore schema (`groupings/` public, `_grouping_meta/` private)
- [x] Cloud Function trigger with lease-based lock + bounded retry
- [x] Tool updates (codex-verify directory support, Python secret scan)
- [x] Frontend integration (grouping-service, useGroupings, AutoGroupToggle, ConfidenceBadge)
- [x] ComparisonPage auto/manual mode with stale data warning

## Phase 3: Harness Engineering (DONE)
- [x] docs/ restructured (design-docs, exec-plans, references, generated)
- [x] CLAUDE.md — agent context map
- [x] Architecture constraint checker (check-architecture.ts)
- [x] ESLint custom rules (secrets, imports, naming)
- [x] Codex CLI external validation (/verify skill)
- [x] Admin page — GenomeUploadPanel connected

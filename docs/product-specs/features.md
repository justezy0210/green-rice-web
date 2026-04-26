# Features — current inventory (2026-04-21)

Living document. Mirrors what is actually deployed + in-flight on `main`.
For identity & framing rules see [`scope.md`](./scope.md). For the
multi-stage pivot history see `docs/exec-plans/active/2026-04-20*` and
`docs/exec-plans/active/2026-04-21*`.

---

## Product identity

**Korean japonica comparative pangenome resource** for 16 temperate
japonica cultivars, with phenotype association surfaced through the
separate Discovery module (not the organizing spine).

Entity hierarchy (reflected in URLs, navigation, and copy):

1. **Cultivar / Gene / Orthogroup / Region** — first-class entities
2. **Discovery** — candidate-evidence overlay module

## Tech stack

- React 19 + TypeScript 5 (strict) · Vite 8 · Tailwind v4 · shadcn/ui
- Firebase (Firestore + Storage) — no backend API server
- Chart.js 4 via react-chartjs-2
- React Router 7

All heavy query data lives on Firebase Storage as precomputed JSON
(often gzipped). Firestore holds relational metadata only.

---

## First-class entity pages

### Dashboard `/`

- Resource overview + panel stats (16 cultivars / 9 traits /
  OrthoFinder / Cactus / IRGSP)
- 4 entity entry cards (Genes / Orthogroups / Cultivars /
  Trait Association — all four active)
- Phenotype distribution chart across 16 × 9
- Trait quality overview (which traits are usable for association)
- Cultivar lookup search

### Cultivars `/cultivars`, `/cultivar/:name`

- 16-cultivar grid list
- Per-cultivar phenotype radar (vs panel average)
- Assembly stats card (total size, N50, GC%, scaffolds)
- Annotation stats (gene count, mean gene length)
- Top 5 repeat classes
- Genome / GFF3 / CDS / protein downloads

### Genes `/genes`, `/genes/:id`

- **508k gene** hybrid live search (starts at 1 character)
  - Gene-ID substring match (gene-id pattern)
  - Pfam / InterPro / GO code lookup (inverted index)
  - Product keyword substring (normalized corpus)
  - Mode routing: hard regex-based `routeQuery`
- **Pagination**: 1000-hit safety cap · shows 50 initially
  (Show 50 more / Show all N)
- **Trait-hit badges** next to each result's OG id: traits where
  the OG has p < 0.05 (4067 OGs qualify), click badge → trait
  association ranking
- Coverage disclosure: functional search covers 11 of 16 panel
  cultivars (funannotate-based)
- Gene detail:
  - **Gene-model SVG** (responsive, UTR5/CDS/UTR3, strand chevron,
    intron backbone, variant-overlay prop ready)
  - **Functional annotation card** — product, GO, Pfam, InterPro,
    EggNOG + COG
  - **16-cultivar copy matrix** (each chip clickable →
    that cultivar's gene in the same OG)
  - Links: OG page, Cultivar page, Region page (position ±5 kb)

### Orthogroups `/og/:id`, `/explore/og/:id`

- Standalone access (no trait context required)
- Header: Core / soft-core / shell / private class badge +
  copy-architecture phrase ("3 multi-copy (×3 max), 13 singleton")
- Anchor representativeness tier badge (representative / mixed /
  nonrepresentative) from annotation occupancy
- **PAV evidence card** (3-class MVP): present /
  absent-evidence-pending / duplicated per cultivar, chips clickable
  to Gene detail; "not validation-grade" disclosure strip
- Tabs:
  - Gene Locations — per-cultivar member genes + cluster grouping
  - **Anchor-locus Variants** — gated by tier:
    - `representative` → shown normally
    - `mixed` → aggregate hidden by default, warning copy
    - `nonrepresentative` → "Show anyway" opt-in
  - Pangenome Graph — tube-map render with cultivar paths
- Anchor locus line is a Link → Region page (cluster ±5 kb)

### Region `/region/:cultivar/:chr/:start-:end`

- Coordinate-first entry (newest entity surface)
- Overlapping genes list (gene_models partition scan) →
  Gene detail link each
- Overlapping OG clusters list (graph manifest scan) →
  OG detail link each
- Header: coord + cultivar + span
- No new precompute — reuses gene_models and og_region manifest

---

## Trait Association module

### `/explore` (renamed from "Explore Candidates")

- 9 traits × GMM-proposed 2–3 phenotype groups
- OGs ranked by Mann-Whitney U on copy-count contrast
- Function categories chart (category filter)
- Grouping summary card (GMM quality)
- OG row click → `/og/:id?trait=…` (sets OG detail's trait-aware
  context and auto-selects trait tab)
- Scope strip: "Candidate prioritization. Not causal, not
  marker-ready. Anchor-locus AF is tier-gated per OG."

### `/download`

- Per-trait candidate bundles
- CSV + JSON + README per trait
- Panel-wide cross-trait bundle

---

## Cross-cutting features

- **Entity triangle navigation** — Gene ↔ Orthogroup ↔ Cultivar ↔
  Region; every chip/label that references another entity is a Link
- **ScopeStrip component** — per-panel inference-unit disclosure
  (replaces the old collapsed `<details>` help block)
- **Header subtitle**: "Comparative pangenome resource · Korean
  temperate japonica"
- **Identity lock** documented in `CLAUDE.md` and `scope.md`

---

## Data precompute inventory (Firebase Storage)

| Path | Size (wire) | Source | Used by |
|---|---|---|---|
| `orthogroup_diffs/{trait}` (Firestore + payload) | ~150 KB × 9 | panel-wide diff | `/explore`, trait hit index |
| `orthofinder/v6/og-members/chunk_*.json` | ~30 MB (54 chunks) | OrthoFinder raw | OG drilldown |
| `orthofinder/v6/baegilmi_gene_annotation.json` | small | GFF3 parse | OG Detail gene tab |
| `og_gene_coords/*` | per-OG | GFF3 + OG crosswalk | Graph / anchor tier |
| `gene_index/v6/by_prefix/*.json` | 30 MB | scripts/build-gene-og-index.py | Gene ID search, gene lookup |
| `gene_models/v6/by_prefix/*.json` | 225 MB | scripts/build-gene-models.py | Gene detail SVG + annotation |
| `functional_index/v6/index.json` | **19.8 MB gzipped** | scripts/build-functional-search-index.py | Gene keyword/code search |
| `trait_hits/v6_g4/index.json` | **22 KB gzipped** | scripts/build-trait-hits-index.py | Search-result trait badges |
| `og_region_graph/v6_g4/**` | ~600 MB (4226 files) | extractor | OG Detail graph + Region reverse |
| `og_region_af/v6_g4/**` | ~1.2 GB (38k files) | extractor | OG Detail anchor-locus variants |
| `downloads/_og_region_manifest.json` | small | promote | Pointer to active v2 release |
| `downloads/traits/{trait}/*` | ~10 MB × 9 | generate-download-bundles.py | `/download` |

---

## Operational infrastructure

### Precompute scripts

- `scripts/build-gene-coords.py` — server-side; GFF3 → per-OG coords
- `scripts/build-gene-og-index.py` — OG members → gene ID reverse index
- `scripts/build-gene-models.py` — funannotate GFF3 → exon + annotation
- `scripts/build-functional-search-index.py` — compact keyword/code index
- `scripts/build-trait-hits-index.py` — per-OG low-p traits
- `scripts/batch-region-extract.py` — server-side; 4067 OG × 9 trait
  graph + AF extraction (~25h)
- `scripts/prepare-og-region-inputs.py` — fingerprints + candidate list
- `scripts/verify-og-region-bundle.ts` — 9 contract checks
- `scripts/promote-og-region.py` — atomic release with preflight
  invariants + immutability + pointer flip + smoke
- `scripts/generate-download-bundles.py` — trait bundle CSV/JSON/README
- `scripts/promote-download-bundles.py` — atomic release of download
- `scripts/make-broken-fixtures.py` — negative-case preflight fixtures
- `scripts/smoke-og-region-hooks.ts` — runtime hook state-transition
  harness

### Release observability

- Preflight invariants before Firebase touch: totals sum, ogs dict
  length, statusCounts sum, AF trait triple match
- `Content-Encoding: gzip` uploads for large index files
- Runtime fetch hooks distinguish `missing` (404) / `unavailable`
  (other failures) / `ok` — pointer breakage no longer silent
- Release template at `docs/releases/og-region-template.md` with
  decision field (pass / pass-with-known-gaps / blocked)

---

## Scope exclusions (forbidden framing)

- **Validated** PAV / LoF / pseudogene / causal / driver / determinant
  language
- KASP / CAPS / primer / marker design · MAS / GS / GEBV
- Parent-pair polymorphism workflow
- "Best / top / proven marker"
- "한국 벼 전체 대표" generalization
- Anchor-locus AF shown as OG-level without tier gating

Allowed (recent thaw, 2026-04-20 scope.md update):

- Evidence-graded PAV state classification with "not validation-grade"
  label

---

## Roadmap — remaining

| Stage | Scope | Status |
|---|---|---|
| 3E | Region ↔ Gene ↔ OG deeper cross-page wiring | not started |
| 3.5 | 6-class PAV (gene-model completeness + synteny evidence) | deferred |
| 3.5 | Multi-isoform display | deferred |
| 3.5 | Repeat annotation track | deferred |
| 3.5 | Cultivar private-OG list precompute | deferred |
| 3.5 | 5 non-funannotate cultivars' gene models | deferred |
| 4 | JBrowse 2 embed (power-user raw inspection) | plan retired, re-scope pending |
| 4 | Cross-cultivar synteny pipeline | not started |
| 4 | Non-reference sequence explorer | not started |
| 4 | Coordinate liftover UI | not started |
| 4 | Server API + Postgres migration (when query complexity forces it) | not started |

---

## Changelog highlights

- **2026-04-18** — Initial scope lock: "phenotype-driven candidate
  discovery DB"
- **2026-04-20** — Pivot to "comparative pangenome resource with
  phenotype-association module"; PAV exclusion narrowed to validated
  claims only
- **2026-04-20** — Stage 1 (information architecture + AF tier gating)
  committed
- **2026-04-20** — Stage 2A/2B/2C (OG standalone + PAV card + Gene
  search/detail + Cultivar expansion) committed
- **2026-04-21** — Stage 3A/3B/3D (gene_models pipeline + SVG +
  core/shell/private) committed
- **2026-04-21** — Stage 3B.1 (functional search + trait-hit badges)
  committed
- **2026-04-21** — Stage 3C (Region page) committed
- **2026-04-21** — og_region v2 extractor completed (4067/4067 OGs,
  25 h); promote in progress (AF upload ~32% at time of writing)

# [PLAN] Gene search: SV overlap evidence badge

## Goal
Add a single collapsed badge on each gene search result row indicating that the gene has observational SV overlap evidence in the gene's own cultivar sample frame, with a tooltip showing locus count, panel carrier ratio, and category (CDS / canonical splice-site / weaker tier).

Must be defensible under the CLAUDE.md exclusion list — no "validated", "causal", "driver", "LoF confirmed".

## Context
Gene detail already renders per-cultivar INS/DEL/COMPLEX glyphs on the gene model (Region-P2 work). At the search level, there is currently no way to scan 1000 rows and notice which genes carry an SV worth opening the detail for. Computing overlap on the fly is prohibitively expensive (chr-level SV bundle + gene model partition + per-cultivar coord side-table, per row). A precomputed lightweight index is the practical path.

Cross-verification (Codex + Claude, 2026-04-24) rejected the initial draft ("≥50 bp AND CDS exon intersection ≥1 bp", typed INS/DEL/CPX chips) on four grounds:
1. "Meaningful impact" label implies functional claim → violates exclusion list
2. DEL asymmetry — sample-frame DEL has no span, so interval-overlap rule silently misses exonic deletions
3. Typed chips unreliable on multi-allelic carriers (canonical event stores ALT0 svType while per-cultivar coord preserves ALT≥1 carriers)
4. ≥50 bp gate re-imposes what `build-sv-matrix.py` already decides via LV=0 / ALT0 length rules + COMPLEX exception

## Approach

### 1. Index builder (Python)
`scripts/build-gene-sv-index.py`:
- Inputs:
  - `sv_matrix/{svReleaseId}/events/by_chr/*.json.gz` (canonical SvEvent[])
  - `sv_matrix/{svReleaseId}/per_cultivar_coords/{cultivar}/by_chr/*.json.gz` (sample-frame coords)
  - `gene_models/v{of}/prefix_*.json` (CDS / UTR / intron / representative transcript)
- Per (cultivar, gene) compute:
  - **strong tier** (CDS or canonical splice): 1 if any SV satisfies the rule below, else 0
  - **weak tier** (UTR/intron only, or ±2 kb flanking with no body overlap): 1 if any such SV, else 0
  - `locusCount` — deduped by normalized breakpoint (DEL) or insertion position ±100 bp
  - `types` present in strong tier set (`['INS','DEL','COMPLEX']` subset — stored but NOT surfaced as separate chips in v1)
  - `carriers` count (number of panel cultivars whose ortholog in the same OG has strong-tier overlap; for tooltip only)
- Overlap rules (representative transcript only):
  - **INS / COMPLEX**: remove VCF left-anchor (skip first refLen=1 anchor bp if present), treat as footprint `[pos+1, pos+max(refLen,1)]` intersected with sample-frame CDS exons or canonical splice sites ±2 bp
  - **DEL**: treat as breakpoint at `pos` (sample frame has no span) + ±5 bp window; overlap if any CDS exon or splice site ±2 bp falls within that window OR if the breakpoint lies inside an exon
  - Weak tier: same SVs but overlapping only UTR, intron, or ±2 kb flanking without strong-tier hit
- Output: `gene_sv_index/v{of}_gm{gm}_r{sv}/index.json.gz` (single bundle):
  ```json
  {
    "schemaVersion": 1,
    "orthofinderVersion": N,
    "geneModelVersion": M,
    "svReleaseId": "...",
    "builtAt": "...",
    "genes": {
      "<gene_id>": {
        "s": 1,         // strong tier present (boolean as 0/1)
        "w": 0,         // weak tier present
        "n": 2,         // deduped locus count in strong tier
        "t": "ID",      // types present: 'I','D','C' concatenated (string); empty if s=0
        "c": 3          // panel carrier count in OG (tooltip only)
      }
    }
  }
  ```
- Key choice: single file (like trait_hits) rather than partitioned. Estimated size: 400 k genes × ~30 B = 12 MB raw → 1–2 MB gzip. Acceptable for one-time load.

### 2. Firestore / Storage rules
Add `match /gene_sv_index/{path=**}` with `allow read: if true` in `storage.rules`. Deploy.

### 3. Types + service (TypeScript)
- `src/types/gene-sv-index.ts`: `GeneSvIndex`, `GeneSvEntry`
- `src/lib/gene-sv-index-service.ts`: `fetchGeneSvIndex(ofVersion, gmVersion, svReleaseId)` with in-memory cache. Use `publicDownloadUrl()` direct fetch (no `getDownloadURL()` — same lesson as sv-service cleanup).

### 4. Hook
`src/hooks/useGeneSvIndex.ts`: fetches once per `(of, gm, sv)` tuple, returns `{ lookup: (geneId) => GeneSvEntry | null, loading, available }`. Gated on the active version tuple from `useOrthogroupDiff(DEFAULT_TRAIT_ID)` + `useGeneModelsManifest` + `SV_RELEASE_ID`.

### 5. UI — SvOverlapBadge component
`src/components/gene/SvOverlapBadge.tsx`:
- Strong tier → solid badge, label "SV", amber-ish accent (distinct from trait chips)
- Weak tier only → outline-only badge, label "SV" with dim styling (optional in v1 — can defer)
- No display if neither tier
- Tooltip:
  ```
  SV overlap evidence — representative transcript
  · 1 locus · CDS / splice
  · 3 / 11 cultivars carry strong-tier SV in this OG
  · Observational — not validation-grade
  ```

### 6. Integration
`src/pages/GeneSearchPage.tsx`: inside the result row, next to (or right after) `TraitHitBadges`, render `<SvOverlapBadge entry={svIndex.lookup(it.geneId)} />`.

### 7. Build + deploy the index for current release
Run the new script against the current `v{of} + gm{gm} + svReleaseId` tuple. Upload artifact. Verify frontend picks it up.

## Files to modify / create

**New:**
- `scripts/build-gene-sv-index.py`
- `src/types/gene-sv-index.ts`
- `src/lib/gene-sv-index-service.ts`
- `src/hooks/useGeneSvIndex.ts`
- `src/components/gene/SvOverlapBadge.tsx`

**Modify:**
- `storage.rules` — add `gene_sv_index/**` public read
- `src/lib/storage-paths.ts` — add path builder for gene_sv_index
- `src/pages/GeneSearchPage.tsx` — wire badge into row

## Risks / Open questions

1. **Multi-allelic sample typing**: canonical event records ALT0 svType; a sample carrying ALT≥1 may have a different type. v1 stores `t` (type string) anyway but we do **not** surface typed chips — single badge only. Revisit after per-ALT schema extension.
2. **VCF left-anchor for INS**: drop first bp anchor before overlap test to avoid exon-boundary false positives.
3. **DEL boundary policy**: ±5 bp breakpoint window. Need test fixtures — `one-base CDS boundary touch`, `gene-engulfing DEL`, `splice site adjacent insertion`.
4. **representative-transcript only** — alternative-isoform-only effects produce both false positives and false negatives. Must state this in tooltip and in the build script docstring.
5. **Whole-gene DEL → gene absent from annotation**: index can't represent this (no row exists to badge). Must NOT imply absence. PAV/conservation handles that.
6. **Index size**: if real 400 k × 30 B estimate is off by 5× we cap at ~10 MB gzip. If too big, partition by 2-char prefix like gene_models.
7. **Release tuple**: path includes all three versions. If any version bumps, index rebuilt. Frontend keys on the same tuple.
8. **Carrier count (`c`)**: requires ortholog resolution via OG → cross-cultivar gene list. Adds complexity to the build script. Can stage: v1 without `c`, add in v1.1 if the tooltip stat proves valuable.

## Verification

- [ ] `scripts/build-gene-sv-index.py` unit-tested with small fixture (5 genes, INS/DEL/COMPLEX each, boundary edge cases)
- [ ] `npm run check:all` passes (lint + type-check + arch + manifest freshness + cross-language)
- [ ] Index bundle under 5 MB gzip; load time < 500 ms on fast connection
- [ ] Visual check on `/genes?q=baegil`: badges appear on genes the detail page already shows SV for (INS / DEL / COMPLEX), absent on genes the detail page shows no overlay for
- [ ] Tooltip text passes exclusion-list review (no "validated" / "causal" / "LoF" / "driver")
- [ ] Edge-case fixture passes: gene-engulfing DEL → badge; SV at exon boundary with VCF anchor-only overlap → no badge; alternative-isoform-only SV → no badge (acknowledged false negative)

## Result (2026-04-25)
- **Status**: DONE
- **Frontend**: `SvOverlapBadge` wired into `GeneSearchPage` via split-out `GeneSearchResultList` (kept page under 300-line soft cap). `useGeneSvIndex` loads once per `(of, svRelease)` tuple.
- **Python builder** (`scripts/build-gene-sv-index.py`): 11/11 edge-case fixtures pass (`scripts/tests/test_build_gene_sv_index.py`). Verified rules:
  - INS/COMPLEX: strip VCF left-anchor (footprint `[pos+1, pos+max(refLen,1)]`)
  - DEL: sample-frame breakpoint ±5 bp tolerance
  - Strong tier = CDS or canonical splice ±2 bp
  - Locus dedup in 100-bp buckets; multi-type aggregation
- **Index build output** (sv_v1 / of6):
  - 18,822 canonical events · 85,399 per-cultivar coord rows · 513,658 genes scanned (11.4 s)
  - Strong tier: **8,195 genes** (1.6 %); weak-only: **34,030 genes** (6.6 %)
  - Bundle size: **raw 2,105 KB → gzip 146 KB** (well under estimate)
  - Types-per-gene distribution (strong): I only 4,462 / D only 1,024 / C only 2,466 / mixed 0 — mixed types rare in this release
- **Storage**: `gene_sv_index/**` public-read rules deployed (`firebase deploy --only storage`); bundle uploaded to `gene_sv_index/v6_rsv_v1/index.json`, public URL 200 verified.
- **Deferred**: carrier count (`c`) — requires OG → cross-cultivar gene join, stays 0 in v1.
- **Known limitations documented in tooltip / docstring**:
  - Representative transcript only — isoform-only effects produce false positives/negatives
  - `svType` chip suppressed (multi-allelic carriers could be mistyped — canonical records ALT0 type only)
  - Framing is strictly observational ("not validation-grade"); no functional-impact claim surface

# CNV ↔ AF — Evidence Layer Separation (post-verify)

Status: active — 2026-04-18
Verify: Codex + Claude cross-verification (2026-04-18) on the question *"Is copy-count diff ↔ AF a valid PAV interpretation?"* Result: **partial validity**. Design currently suggests a causal link that the data often cannot support.

## Problem

Current OG Detail conflates three independent evidence layers into a single "cluster → AF → graph" flow and invites researchers to read the AF tab as if it explains why one phenotype group lost a gene copy. Consensus across both reviewers:

1. **AF ≠ copy dosage.** `vg deconstruct` AF is the frequency of ALT-path samples at a snarl, not a per-cultivar copy count.
2. **OrthoFinder copy counts are not locus-level CNV calls.** They can shift with annotation splits, pseudogenes, or recent paralogs; meanDiff = 1.0 is a candidate signal, not proof.
3. **Non-syntenic / off-reference events are silently absent from AF.** Liftover failure is currently framed as a tech error when it is often biological novelty.
4. **REF/ALT truncation (20bp) makes SVs look like SNPs.** UI hides the one cue that would reveal PAV.
5. **`vg deconstruct` splits SVs into complex nested bubbles** — a single PAV can appear as several SNP-like rows.

The DB is sound as a **hypothesis-generation** tool. It becomes misleading only when the UI language and defaults suggest the CNV-AF link is automatic.

## Goal

Keep the current filtering + drilldown, but split the UI into **four evidence layers** whose scope is honestly labelled. Each layer maps to a specific UI location.

| Layer | UI location | Source | Claim it supports |
|-------|-------------|--------|-------------------|
| 1. OG association | OG Detail **header** | OrthoFinder matrix + Mann-Whitney | "This OG's copy count separates the groups" |
| 2. Locus evidence | Gene Locations tab (per cluster) | cultivar GFF3 + grouping doc | "Annotated OG-member presence: early 8/8 · late 2/5" |
| 3. Variant representation | Gene-region Variants tab | Cactus deconstruct VCF (+ per-cluster og_region) | "Observed reference-anchored variants and their group AF" |
| 4. Copy-number evidence (future) | Dedicated placeholder card | graph genotyping / depth / PAV matrix | "This cultivar actually has N copies" — **not yet available** |

Layer 2 wording is intentionally conservative: it states "annotated member presence", not "gene present/absent". Annotation splits and OrthoFinder paralog grouping can shift this count — we do not claim locus-level PAV.

## Approach

### P0 — UI truth repair

Time budget: implementation ~1h · copy audit ~30min · manual QC ~30min.

Scope: wording and variant display. No data changes.

1. **Event class column + length display (heuristic)**
   - Files: `src/components/explore/OgDrawerAlleleFreqSection.tsx`, and `OgDetailAlleleFreqTab` if it renders its own row (audit first).
   - New column `event class` (not `type`). Values: `SNP` / `indel-ins` / `indel-del` / `SV-like` by length heuristic (max(len(REF), len(ALT)) ≥ 50bp → `SV-like`).
   - Display `REF {nREF}bp / ALT {nALT}bp` when either exceeds 20bp. Keep truncated sequence preview.
   - Legend footer: "Event class is a length-based heuristic. `vg deconstruct` can split a single SV across multiple SNP-like rows."

2. **AF tab framing and liftover states**
   - File: `src/components/og-detail/OgDetailAlleleFreqTab.tsx`
   - Copy rule: no `explain` / `reveal PAV` / `shows CNV` / `copy dosage` language anywhere in the tab or tooltip. State what is shown, not what it proves.
   - Base line: "Observed variants in this cluster's IRGSP-lifted region. AF is ALT-path frequency, not a per-cultivar copy count."
   - Liftover state table (Codex-required):

     | `region.liftover.status` or manifest flag | Label | Caveat |
     |----|----|----|
     | `mapped` (coverage ≥ 0.8) | (no badge — default case) | Base line above |
     | `partial` (coverage 0.5–0.8) | `Partial lift` | "Liftover covers {pct}% of cluster span. Events in unmapped portions are absent from this table." |
     | `unmapped` (coverage < 0.5 or no IRGSP region) | `Non-syntenic candidate` | "This cluster does not map stably to IRGSP. Absence from the AF table may be non-syntenic novelty *or* a lift-over artifact — check the cluster's raw coords." |
     | `missing` (no `og_region` file for cluster) | `Region data unavailable` | "Per-cluster region batch has not processed this cluster yet." |
     | `error` (manifest reports error) | `Region extraction failed` | Show `errorMessage` if present. |

3. **OG detail header — Layer 1 summary chip**
   - File: `src/pages/OgDetailPage.tsx`
   - New chip text: `CNV candidate · {trait} · Δmean {x.x} · p {xxx}`. Tooltip: `Δmean` = "mean copy count difference between `{group0}` and `{group1}`". No "early vs late" wording in the header (still visible via expanded stats line).

### P1 — Locus evidence layer

Time budget: implementation ~1h · audit ~30min · QC ~30min.

4. **Annotated OG-member presence count per cluster**
   - Files: `src/lib/og-gene-clusters.ts` (new pure helper), `src/components/og-detail/OgDetailGeneTab.tsx` (display), `src/pages/OgDetailPage.tsx` (wire props).
   - Helper signature: `computePresenceByGroup(coords, groupByCultivar) → Record<clusterId, Record<groupLabel, { present: number; total: number }>>`. Memoize at page level (cluster list is already useMemo'd).
   - Presence = "cultivar has ≥ 1 annotated OG member in this cluster's chr/region". Definition is OG-membership + cluster-scope, not "locus presence" — wording in UI must reflect this.
   - Render inline on the cluster button: `early 8/8 · late 2/5`. Tooltip: "Cultivars with an annotated OG member overlapping this cluster region."

5. **Liftover state wired from manifest (Layer 3 ↔ Layer 2 bridge)**
   - Files: `src/components/og-detail/OgDetailGraphTab.tsx`, `OgDetailAlleleFreqTab.tsx`, `src/hooks/useOgRegion.ts` (or new `useOgRegionStatus`).
   - Resolve cluster status using the state table above; surface it identically in both AF and Graph tabs (single helper `resolveClusterRegionStatus(regionData, manifestEntry): ClusterRegionStatus`).
   - Use the `ClusterRegionStatus` in both tabs' header row and empty-state copy.

### P2 — Copy-number evidence (future plan, not in scope here)

- Graph-based genotyping (`vg pack` + `vg call`) per cluster
- Assembly-based PAV matrix (present/absent per cultivar × OG)
- PSV / k-mer–based paralog-specific CN readout

Open a separate exec-plan when one of these is prioritised.

## Non-goals

- Re-running the Cactus pangenome or the og_region batch (P0/P1 are UI-only).
- Implementing actual copy-number measurement (P2).
- Changing the OG ranking metric. Copy-count diff stays as the filter; we only relabel what it claims.
- Summary tab (separate P1 from the earlier OG Detail plan) — still deferred.

## Files to modify / create

Modify:
- `src/pages/OgDetailPage.tsx` — header label wording
- `src/components/explore/OgDrawerAlleleFreqSection.tsx` — variant type column + SV badge + length display
- `src/components/og-detail/OgDetailAlleleFreqTab.tsx` — neutral framing + non-syntenic state
- `src/components/og-detail/OgDetailGraphTab.tsx` — non-syntenic state
- `src/components/og-detail/OgDetailGeneTab.tsx` — per-cluster group presence count
- `src/lib/og-gene-clusters.ts` — helper for group presence count

Likely no server / batch changes. Existing `og_region/_manifest.json` already carries `liftover.status` per cluster.

## Risks

1. **Event-class inference is heuristic.** A 50bp tandem dup inside a complex bubble may still be split across several sub-50bp rows. `SV-like` is a hint; legend must say so.
2. **Presence count depends on OG + annotation quality.** OrthoFinder paralog-merge / split can shift counts. The wording `annotated OG-member presence` (not `gene present`) keeps the claim scoped to what the data supports.
3. **`Non-syntenic candidate` framing can over-claim.** Liftover failure can also be a lift-over artifact. Caveat line in the state table handles this.
4. **Label changes risk breaking screenshots / docs.** One-time migration; docs grep included in the copy audit.
5. **Render cost of presence count.** Computed once per OG at page level (memoized), not per cluster button render.

## Acceptance criteria

These must all hold before moving to completed/:

1. No text in the AF tab, OG header, drawer, or tooltips asserts that AF "explains", "reveals", "proves", or "shows" CNV / PAV / copy dosage. (Lint via grep for those verbs.)
2. Every variant row whose max(REF,ALT) length exceeds 20bp shows the length. Every row ≥ 50bp shows the `SV-like` badge.
3. A cluster whose manifest entry marks `unmapped` renders the `Non-syntenic candidate` label in both AF and Graph tabs — never silently empty.
4. Each cluster button in Gene Locations shows per-group presence counts `{group} {present}/{total}` consistent with `groupByCultivar` and `OgGeneCoords`.
5. The OG detail header chip reads `CNV candidate · {trait} · …` (or equivalent), not `{trait} · {g0} vs {g1}`.

## Copy audit checklist

Grep + manual read through before commit:

- `OgDetailPage.tsx` header chip and breadcrumb
- `OgDetailAlleleFreqTab.tsx` (new + existing copy)
- `OgDetailGraphTab.tsx` (liftover framing)
- `OgDrawerAlleleFreqSection.tsx` (shared with Explore drawer)
- Explore drawer and diff table tooltips
- Empty / error / loading states in every touched component
- Any docs or help text mentioning "copy number" or "AF" together

## Verification samples (fixed)

Use these exact samples so reviewers agree:

- `OG0000987` cluster `baegilmi_chr06_9755166` (cultivar-anchored, liftover mapped, small variants).
- `OG0000987` IRGSP reference pseudo-cluster (`irgsp_chr10_20719171`, OG-level AF).
- `OG0000987` cluster `jopyeong_chr01_18942063` (expected `Non-syntenic candidate` — the cross-chr translocation discussed during the verify cycle).
- At least one variant from any cluster with `len(REF)` or `len(ALT)` ≥ 50 (find from manifest). Expected row: `SV-like` badge + length display.

## Verification steps

- [ ] `npm run build`
- [ ] `npm run check:arch`
- [ ] Unit tests (new): helper for `computePresenceByGroup`, event-class classifier, and `resolveClusterRegionStatus` — each with 3+ cases (happy path, edge, degenerate input).
- [ ] Copy audit checklist walked end-to-end.
- [ ] Manual: all four sample clusters above, check the five acceptance criteria per sample.
- [ ] `/verify general-review` on the final UI copy before commit. Foreground per updated verify skill.

## Result (fill when moving to completed/)

- Status:
- Notes:

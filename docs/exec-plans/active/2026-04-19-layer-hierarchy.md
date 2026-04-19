# Layer Hierarchy — Primary Discovery vs Supporting Evidence

Status: active — 2026-04-19
Source: cross-verification (Claude Lead + Codex GPT-5.4) on the "protagonist" question.

## Decision

**A-Prime (OrthoFinder-primary, Cactus-supporting)** confirmed.

- **Primary discovery axis**: OrthoFinder orthogroup copy count / PAV, ranked by Mann-Whitney U between phenotype groups
- **Supporting evidence**: Cactus VCF AF (locus context) + Cactus graph (structural context)
- **Explicitly not**: AF/graph as ranking axes; combined scores; dual-entry discovery
- **Future optional**: variant-led rescue lookup (not co-equal ranking)

## Why this, not the alternatives

1. **Korean temperate japonica has low intra-panel SNP diversity.** AF-based ranking would produce weak, noisy candidates (literature: Ji et al. 2021, McNally et al. 2008, Courtois et al. 2013).
2. **CNV/PAV from the pangenome is our niche.** K-rice / SNP-Seek / RiceVarMap are SNP-centric. Layer 1 is where we add value the others can't.
3. **Solo team, one narrative.** Dual-entry fragments attention, doubles false-positive budget, invites "which is right?" confusion.
4. **Scientific defense of MWU on copy count.** Matches the discovery question, the data type, and the sample structure better than ΔAF or combined scores.

## Problem

Current UI leaks ranking authority into Layer 2:
- Explore table allows sort by `ΔAF` alongside `p` and `log2FC` — makes AF look like a co-primary ranking signal
- AF tab shows "top 30 by ΔAF" as default ordering — invites users to read high-|ΔAF| rows as the trait-explaining variants
- Graph tab defaults to `graphOverlap` sort — suggests an alternate "similarity axis" with biological meaning
- OG Detail page presents Gene Locations / Variants / Graph as visually equal tabs — masks which is the discovery signal vs the evidence

Result: users can end up treating Layer 2 as a separate ranker, which is both inconsistent with our locked identity and scientifically weaker than the intended CNV-first framing.

## Goal

Keep Layer 2 visible and useful as evidence. Strip it of any ranking authority. Make the Layer 1 → Layer 2 hierarchy visible and unambiguous on every page that shows both.

## Scope — In

- Explore table: remove ΔAF from the sort key set
- AF tab: default ordering → genomic position; drop "top N by ΔAF" language; move caveat above the table
- Graph tab: default sort → phenotype; relabel `graphOverlap` as an exploratory alternate layout, not an axis name
- Explore: small banner above the diff table stating that AF and graph are supporting evidence
- OG Detail header: fixed one-liner stating why this OG is a candidate (copy-count difference) and what the AF/graph tabs are for (supporting context)
- OG Detail tab labels: reorder + rename so discovery signal reads before evidence, e.g. `Orthogroup members` · `Supporting variants` · `Graph context`
- Layer 2 coverage badge on AF/Graph surfaces: `11/16 cultivars · Reference-anchored · May miss non-syntenic movement`
- Remove `|ΔAF| ≥ 0.5 count` badge from variant sections
- Visual de-emphasis of AF bars (thinner, neutral color, number-first)

## Scope — Out (do not build, do not claim)

- Combined score across Layer 1 and Layer 2
- Variant-led discovery ranking (would violate A-Prime)
- Claims that AF or graph confirm or validate the candidate
- Any "best marker" / "deployment-ready" framing (remains excluded per `docs/product-specs/scope.md`)

## Future, separate plan (not in this one)

- **Variant-led rescue lookup** at `/variants` or similar — filter/search only, no ranking. Allows users to enter at a gene/region and inspect variant evidence. Used when copy-count signal is absent but sequence evidence may exist. Optional rescue badge on OG Detail (`No copy-count signal; sequence evidence exists`). Kept out of the homepage, out of Explore's ranked flow.

## Approach

### P0 — Strip Layer 2 ranking leaks (~30–45 min)

1. **Explore: remove ΔAF from sort keys**
   - File: `src/pages/ExplorePage.tsx` (`VALID_SORT`) + `src/components/explore/OrthogroupDiffTable.tsx` sort UI
   - Keep `p` (default) and `log2FC`
   - Users can still see ΔAF as a column inside the AF tab but cannot rank the Explore table by it

2. **AF tab: default ordering → genomic position**
   - File: `src/components/og-detail/OgDetailAlleleFreqTab.tsx` (`toOgVariantSummary` sorts by `deltaAf`; change to position)
   - File: `src/components/explore/OgDrawerAlleleFreqSection.tsx` — remove `Showing top 30 of N by ΔAF` wording; replace with `Showing first 30 rows in genomic order. Use for local context, not ranked variants.`
   - Keep ΔAF as a column; just not as the ordering basis

3. **Graph tab: default sort → phenotype + relabel**
   - File: `src/components/og-detail/OgDetailGraphTab.tsx` (`useState<TubeMapSortMode>('graphOverlap')` → `'phenotype'`)
   - File: `src/components/og-detail/SortToggle.tsx` — label `Graph overlap` → `Alternate layout`; tooltip softened to "Exploratory layout by shared graph pattern. Not a biological similarity axis."

4. **Explore mini banner above the diff table**
   - File: `src/components/explore/OrthogroupDiffTable.tsx`
   - Copy: `OG-level copy-count candidate screen for this 16-cultivar panel. AF and graph are supporting context, not ranking.`

### P1 — Framing + hierarchy (~30–45 min)

5. **OG Detail top one-liner**
   - File: `src/pages/OgDetailPage.tsx` (insert under header, above ScopePanel)
   - Copy: `This candidate was prioritized by orthogroup copy-count difference between phenotype groups. The Variants and Graph tabs provide supporting sequence and structural context — not confirmation.`

6. **AF caveat → above the table**
   - File: `src/components/og-detail/OgDetailAlleleFreqTab.tsx`
   - Move the existing "AF is ALT-path frequency, not a per-cultivar copy count" caveat from below the `ClusterHeader` to above the `OgDrawerAlleleFreqSection` render

7. **Remove `|ΔAF| ≥ 0.5 count` badge**
   - File: `src/components/explore/OgDrawerAlleleFreqSection.tsx` (the `highDelta.length > 0` amber badge)
   - Rationale: a highlighted "count with large ΔAF" reads as an inline ranking claim

8. **Layer 2 coverage badge**
   - File: `src/components/og-detail/OgDetailAlleleFreqTab.tsx` + `OgDetailGraphTab.tsx`
   - Small pill near the source label: `11/16 cultivars · IRGSP-anchored · may miss non-syntenic events`

### P2 — Visual de-emphasis (~20–30 min)

9. **AF bars thinner + more neutral**
   - File: `src/components/explore/OgDrawerAlleleFreqSection.tsx` (`AfBar`)
   - Narrower, lower opacity, number-first ordering in row
   - Keep readable but stop inviting size-based causal reading

10. **Event class color hierarchy softened**
    - File: `src/lib/variant-event-class.ts` (`eventClassBadgeClass`)
    - Keep SV-like distinguishable but less warm / less attention-grabbing (e.g. neutral amber at lower saturation)

## Files to modify

- `src/pages/ExplorePage.tsx`
- `src/pages/OgDetailPage.tsx`
- `src/components/explore/OrthogroupDiffTable.tsx`
- `src/components/explore/OgDrawerAlleleFreqSection.tsx`
- `src/components/og-detail/OgDetailAlleleFreqTab.tsx`
- `src/components/og-detail/OgDetailGraphTab.tsx`
- `src/components/og-detail/SortToggle.tsx`
- `src/lib/variant-event-class.ts`

No new files. No data pipeline changes.

## Risks

1. **P0.1 breaks existing deep links** using `?sort=deltaAf` on Explore. Mitigation: treat unknown sort keys as default `p`, don't redirect.
2. **Users accustomed to ΔAF ordering in the AF tab may see this as a regression.** Mitigation: keep ΔAF column visible and sortable *within* the tab; only the default order changes.
3. **"Alternate layout" label sounds vague.** Acceptable — the goal is to stop implying biological meaning, not to sell the layout.
4. **Removing highDelta badge loses an at-a-glance "there's something here" cue.** Acceptable trade-off per scope.md red flag #6 (ranking scores read as confirmation).

## Verification

- [ ] `npm run build`
- [ ] `npm run check:arch`
- [ ] Grep: no remaining `by ΔAF` / `top N by` phrasing in user-facing copy
- [ ] Manual: Explore sort dropdown only offers `p`, `log2FC`
- [ ] Manual: AF tab opens in genomic order, ΔAF column present and sortable via column header if supported
- [ ] Manual: Graph tab opens in phenotype order; toggle still works
- [ ] Manual: OG Detail header shows the one-liner; coverage badge visible
- [ ] `/verify general-review` on the final UI copy (foreground, per verify skill)

## Result (fill in when moving to completed/)

- Status:
- Notes:

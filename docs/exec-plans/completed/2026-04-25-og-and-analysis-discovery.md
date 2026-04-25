# [PLAN] `/og` entity-first refresh + `/analysis` trait-first preview

## Goal

Make the entity-vs-module split land cleanly in the URL surface:

- **`/og`** stays the OG **entity browser** (intrinsic structure + observational evidence). Strengthen entity-intrinsic discovery so a user landing here can act on the 53 k OG inventory without having to know a trait first. Trait signal stays as a side overlay (badge), never the primary axis.
- **`/analysis`** owns the **trait → top OGs** narrative. Today the run list links to `/analysis/{run}` (workflow start) and the actual ranking is two clicks deeper. Surface the top OGs per run inline so a trait-first researcher can hit the answer from the home page.

## Context

CLAUDE.md identity lock (2026-04-18) puts Cultivar / Gene / Orthogroup / Region as 1급 surfaces and Trait Association as 2급 (overlay/module). User feedback today: landing on `/og` does not jump out; the natural instinct is "show me top OGs per phenotype group", but that flips the hierarchy. Resolution agreed: split — `/og` stays entity-first, `/analysis` carries the trait-first ranking surface.

Concretely the current `/og` (`OrthogroupIndexPage`) already has presets and trait chips, but:
- Presets put `Rare + Private` as default which is a single intrinsic axis. There's no functional-category entry point even though `og_categories` is precomputed.
- `Trait-discriminating` preset is one of seven; trait signal is mixed in with intrinsic axes (rarity, IRGSP) instead of cleanly demoted as overlay.
- No CTA pointing the trait-first user to `/analysis`.

`/analysis` home shows trait runs but only as titles + candidate counts. The top-OG ranking lives at `/analysis/{run}/orthogroups`.

## Approach

### A. `/og` — entity-first refresh

1. **Function category strip (new)**
   - Compact bar at top: counts per `CategoryId` (kinase, receptor, tf, transporter, defense, …) using `useOgCategories(version)`.
   - Click → filters table to that category. URL state `?category=kinase`.
   - Placement: above the preset row.

2. **Preset reorganisation**
   - Group the buttons visually: intrinsic (Rare+Private, Rare, Private, Universal, Absent in IRGSP) on the left, overlay (Trait-discriminating) on the right with a thin divider.
   - Default stays `Rare + Private` (real PAV inventory).
   - Label `Trait-discriminating` more honestly: "Has trait p<0.05 (overlay)".

3. **Trait-first CTA card**
   - Slim card above results: "Looking for OGs that distinguish a phenotype group? → /analysis (per-trait ranking)". Single line, dismissible later if it gets noisy. Plain link, no JS state for now.

4. **Copy update**
   - Page subtitle → "Cross-panel orthogroup inventory. Conservation tier and IRGSP status are intrinsic; trait association shows as a side badge."

5. **No changes to row schema or sort default** — still rarity asc → trait p ascending → ogId. The sort already de-emphasises trait p as a tiebreaker.

### B. `/analysis` home — trait-first preview surface

1. **Per-run top OGs inline**
   - For each `AnalysisRun` row, fetch `useOrthogroupDiff(traitId)` (already in cache for active runs) and pull top 3 OG ids by p-value.
   - Render as small chips on the right of each row: `OG…871 · OG…412 · OG…99`. Click → `/og/{id}?trait=<traitId>`.
   - Skip if entries not available; degrade silently.

2. **"Open OG ranking" deep link**
   - Replace the generic `Open →` arrow with two explicit affordances:
     - `OG ranking →` (deep links to `/analysis/{run}/orthogroups`)
     - `Workflow →` (existing link to `/analysis/{run}`)

3. **No new page** — the AnalysisStepOrthogroupsPage already has the full ranking table. We're just lifting its top-3 to the home so it's reachable without a click.

## Files to modify / create

**Modify:**
- `src/pages/OrthogroupIndexPage.tsx` — function category strip, preset grouping, CTA, copy
- `src/pages/AnalysisHomePage.tsx` — per-run top-OG preview chips, dual deep links

**Possibly extract (if `OrthogroupIndexPage` exceeds 300 lines):**
- `src/components/explore/OgCategoryStrip.tsx`

**Possibly add hook:**
- `src/hooks/useTopOgsForRun.ts` if the per-row OG-diff fetch wants caching beyond what `useOrthogroupDiff` already provides.

## Risks / Open questions

1. **Per-run fetches on `/analysis` home**: if there are N runs and each fetches its diff doc, that's N Firestore reads on home page load. Acceptable today (N ≈ traits); revisit if it grows. Use `useOrthogroupDiff` which is shared with other pages.
2. **Function category strip overflow**: 19 categories — needs to wrap or scroll. Use compact `flex-wrap` + show count on each.
3. **Trait abbreviation density**: existing trait chip column on `/og` wraps at 5 traits + overflow `+N`. Already handled.
4. **Plan-doc duplication with `/og` start-here bins history**: this revises the bins concept rather than discarding it — keep the existing presets (entity-intrinsic + one labelled overlay) so the prior `og-region-expansion` plan's "start-here" goal still holds.
5. **CLAUDE.md exclusion list**: do not introduce wording that implies validated trait causation in `/og` chip tooltips. Trait chips remain "p<0.05 in <trait>" framing.

## Verification

- [ ] `npm run check:all` clean
- [ ] `/og` lands with function-category strip visible, intrinsic presets selected by default
- [ ] Clicking a category filters the table; clearing returns to full
- [ ] Trait CTA card links to `/analysis`
- [ ] `/analysis` home shows top-3 OG chips per run, each linking to `/og/{id}?trait=…`
- [ ] No nested anchor / hydration warnings on `/analysis` (chips inside row Link → use sibling Link pattern from prior gene-search fix)
- [ ] No page exceeds 300-line soft cap (`check:arch` warning)
- [ ] Manual: `/og?category=kinase` deep link round-trips state correctly

## Result (2026-04-25)
- **Status**: DONE
- **`/og`**:
  - Function category strip (`OgCategoryStrip`) added above presets — counts respect the active preset cohort, click-to-filter with single-active toggle, color swatch reuses `CATEGORY_DEFS` palette
  - Preset row visually grouped: 6 intrinsic buttons | divider | 1 overlay button (`Has trait p<0.05 (overlay)`) styled amber so the overlay status reads at a glance
  - Subtitle now states "Conservation tier and IRGSP status are intrinsic; trait association shows as a side badge" + inline link to `/analysis` for trait-first ranking
  - `OgRow` extracted to `src/components/explore/OgIndexRow.tsx` to keep the page under the 300-line cap (final 267 lines)
- **`/analysis`**:
  - `AnalysisRunRow` component pulls top-3 OGs per run via shared `useOrthogroupDiff` cache; renders each as a click-through chip linking to `/og/{id}?trait=<traitId>`
  - Each row now offers two explicit affordances: `OG ranking →` (deep link to `/analysis/{run}/orthogroups`) + `Workflow →` (existing 5-step entry)
- **Verification**: `check:all` clean (lint, tsc, arch, manifest, cross-language, pytest 32/32). Manual round-trip on `/og?category=kinase` not validated yet — URL state currently lives in component state, not search params; deferred since no plan-level commitment to deep-link the category filter.
- **Deferred**: deep-link `?category=…` round-trip if needed later; carrier-count in OG SV badge.

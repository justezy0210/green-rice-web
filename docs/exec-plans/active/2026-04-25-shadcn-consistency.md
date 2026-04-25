# [PLAN] shadcn primitive consistency migration (rev. 2)

## Goal

Make the UI primitive layer internally consistent. Today shadcn is installed (base-nova style, Base UI primitives) but only `Card` (38 imports) is meaningfully adopted. The user explicitly chose **migration** over deletion of unused primitives — this plan migrates raw patterns to shadcn so design tokens, hover/focus states, ARIA, and keyboard behavior live in one place. Unused primitives that have no migration target after this work (none expected) are out-of-scope; do not propose deletion.

## Context

- Theme tokens already wired: `--color-primary` = `hsl(142 71% 45%)`, `--color-accent`, `--color-popover`, `--color-destructive` in `src/index.css`.
- Existing shadcn `button.tsx` already exposes sizes `xs`, `sm`, `default`, `lg`, `icon-xs`, `icon-sm`. Height isn't the concern; semantic fit is.
- `DropdownMenu` was just installed and wired into `Header.tsx`; uncommitted in working tree. This plan treats it as Phase 0.
- Domain palette helpers already exist: `tierTone()` (`src/lib/og-conservation.ts`) is canonical for tier badges. Generic `Badge` must NOT duplicate that — use a domain wrapper instead.
- Dense `text-xs` tables with `table-fixed` + `colgroup` widths are common (e.g. `OrthogroupDiffTable`, `OrthogroupIndexPage`). shadcn `Table` defaults (`overflow-x-auto` wrapper, `h-10` cells, `whitespace-nowrap`) will collide unless variants/density mode are introduced.
- 300-line soft cap is enforced by `check:arch`. Already-near-cap files: `OrthogroupDiffTable.tsx` (298), `AnalysisStepVariantsPage.tsx` (292), `OrthogroupIndexPage.tsx` (269). Migration usually adds lines.
- No Storybook / visual regression test. Smoke is manual on `localhost:5173`.

## Scope inventory (rerun before each phase)

Counted on 2026-04-25, expected to drift; refresh on each phase start:

**Phase 0 baseline (2026-04-25, post-DropdownMenu):**

- raw `<button>` sites: **51**
- raw `<table>` sites: **14** (excluding `ui/table.tsx` itself)
- amber/red/green pill / badge patterns: **32**
- raw `<input>` (incl. login + search/filter inputs): **15**
- raw `<select>`: **2**
- button-styled `<Link>` (Link with bg-/border-/rounded styling): **17 across 15 files**

**Tooling probe (2026-04-25):**
- `npx tsx --version` → v4.21.0 ✓
- `npx knip --version` → 6.6.3 (resolved on demand) ✓
- `npm run build` → 492 ms, dist emitted, 1 chunk-size warning (informational) ✓

## Allowed raw exceptions (frozen at Phase 1)

The following remain raw on purpose; not all clickable elements should be `<Button>`:

- **Dense 10–11 px toggle chips** that pack 5+ in a row (`/og` preset row, `OgCategoryStrip` chips). Migration would pad them to look like buttons and break density.
- **Inline clear / dismiss `x`** (search clear).
- **SVG-internal controls** (region track interactions).
- **Row-internal anchor links** in tables that already use `Link` for navigation. Don't double-wrap with `<Button asChild>`.

Anything outside this list MUST be migrated. Each exception in code carries a single comment `// raw: dense chip` (or matching reason) so a future audit can grep for it.

## Approach (phased — surface-by-surface, NOT primitive-by-primitive)

Each phase = its own commit. Commit gate: `npm run check:all` ✓ and `npm run build` ✓ and visual smoke on every route in the phase's QA matrix.

### Phase 0 — Baseline

1. **Tooling probe**: confirm `npx tsx`, `npx knip`, `npm run build` actually run in this checkout. If any is broken, fix in this phase before any migration.
2. **Commit the existing DropdownMenu/Header change** as a standalone baseline so all migration phases start from a clean tree.
3. Refresh scope inventory counts (see above) — record raw `<input>`, `<select>`, button-styled `<Link>`.
4. **Output**: a baseline commit on `main` + scope numbers appended to this plan.

### Phase 1 — Primitive API design (no code migration)

Decide and document, before touching any consumer file:

1. `ui/badge.tsx` variants (generic): `default | success | warning | destructive | outline` only. **No** domain variants.
2. **Domain wrappers** (new files):
   - `src/components/badges/TierBadge.tsx` (uses `tierTone()` + `Badge`)
   - `src/components/badges/TraitHitBadge.tsx`
   - `src/components/badges/SvOverlapBadge.tsx` (existing — refactor to use `Badge`)
3. `ui/button.tsx` decisions:
   - Buttons that navigate use `<Button asChild><Link to="…" /></Button>` (or Base UI `render={<Link to=… />}` if `asChild` not exposed).
   - Confirm available sizes match needs (`xs` for compact action chips, `sm` default for secondary, `default` for primary CTA).
4. `ui/table.tsx` decisions:
   - If shadcn defaults collide with dense tables, add a **dense** variant (`density?: 'default' | 'dense'`) that drops `h-10`, `whitespace-nowrap`, the wrapper `overflow-x-auto`, and shrinks padding. Verify on a single dense fixture before opening migration phases.
   - Confirm shadcn `Table` accepts `<colgroup>` children pass-through.
5. **Output**: an `api-decisions.md` block appended to this plan with concrete TS signatures. No `.tsx` consumer file changes in this phase.

### Phase 2 — auth / admin / header

Surfaces touched: `Header.tsx`, `LoginPage.tsx`, `AdminPage.tsx` and admin sub-components.
Migrations: Sign Out / Login buttons, form submits, AdminPage CTAs, admin tables (`CultivarTable`).
Validates: `Button asChild` with Link, `Table` dense variant on the smallest table.

### Phase 3 — entity browse

Surfaces: `OrthogroupIndexPage` + `OgIndexRow`, `GeneSearchPage` + `GeneSearchResultList`, `OgCategoryStrip` (chip exceptions stay raw), `CultivarsListPage`.
Migrations: result-list pagination buttons (`Show 50 more` etc.), trait/SV chips → domain badges, the OG index table.
Pre-step: if `OrthogroupIndexPage.tsx` line count is near the cap, extract preset row into its own component first.

### Phase 4 — analysis tables

Surfaces: `OrthogroupDiffTable` (most complex; validate dense Table here), `AnalysisStepOrthogroupsPage`, `AnalysisStepCandidatesPage`, `AnalysisBlockListPage`, `BlockCandidateTable`, `CrossTraitBlockCompare`, `OgIntersectionsSection`, `OgCultivarCopyMap`, `OgDrawerAlleleFreqSection`, `AnalysisHomePage` + `AnalysisRunRow`.
Pre-step: extract sort header / pagination / category filter from `OrthogroupDiffTable` if line count breaks the cap.

### Phase 5 — remaining surfaces

Whatever is still raw after Phases 2–4. Likely: dashboard `ResistanceGrid`, `ConservationSummary` chips, `OverlappingBlocksPanel`, region track minor controls, raw `<input>` / `<select>` outside auth.

### Phase 6 — cleanup

1. `npx knip` — confirm no new unused exports in `src/components/ui/*` and `src/components/badges/*`.
2. `npm run check:all` + `npm run build` final.
3. Manual smoke on every route in the QA matrix.
4. Update plan `Result` section with: total before/after raw count diff, surfaces migrated, allowed-raw exception list (final), open follow-ups.

## Per-phase deliverables (standardized)

Each phase commit message + plan section update must include:

- **Surfaces touched**: pages and components by path
- **Raw count delta**: `<button>`, `<table>`, pill, raw input/select, button-styled Link — before/after
- **New exceptions**: any new `// raw: <reason>` comment added (path:line)
- **QA matrix run**: route + auth state + key interaction (sort / filter / paginate / submit / open dropdown / keyboard tab) — pass/fail per row
- **Touched files** (paths)

Without all five entries, the phase is not done.

## QA matrix (refined per phase, partial seed)

| Route | Auth state | Key check |
|---|---|---|
| `/` (Overview) | logged-in or guest | dashboard cards render, cultivar lookup works |
| `/login` | guest | login submit + Google sign-in |
| `/admin` | admin | CRUD table interactions |
| `/cultivars` | guest | list table sort + row click |
| `/cultivar/:name` | guest | detail loads, no console errors |
| `/genes?q=baegil` | guest | id mode result list, badges render, click row → /genes/:id |
| `/genes/:id` | guest | gene detail, SV overlay, conservation card |
| `/og` | guest | category strip filter, preset toggle, sort, pagination |
| `/og/:id?trait=…` | guest | conservation, SV badges, ranked entries |
| `/analysis` | guest | runs list, top-OG chips, ranking + workflow links |
| `/analysis/:run/orthogroups` | guest | sort, search, pagination, row → OG detail |
| `/analysis/:run/blocks` | guest | block list table |
| `/region/:c/:chr/:r` | guest | region track + overview |
| `/download` | guest | download links work |

For each, log keyboard tab order + visible focus + no hydration warnings in console.

## Risks / Open questions

1. **`<Button asChild>` + `<Link>`** clones props onto the rendered element — confirm prop merge order doesn't strip `to=`. Test in Phase 1.
2. **shadcn `Table` density** — adding a `dense` variant means deviating from default shadcn API. Document the deviation in `api-decisions.md` so future shadcn updates don't silently override it.
3. **Allowed-raw drift** — without enforcement, exceptions will multiply. Consider a lint rule (eslint-plugin custom) in a follow-up to forbid raw `<button>` outside `// raw: …` annotated lines. Out of scope this plan; flag as follow-up.
4. **Visual drift** between `bg-green-600` (hand-coded) and `bg-primary` (theme token at hsl(142 71% 45%)). The token resolves to a near-identical green; verify on Phase 2 with both rendered side-by-side.
5. **Form size** ≈ 70 call sites total. Phase 4 (analysis tables) is the largest single phase; willing to split if QA matrix grows.
6. **No visual regression infra** — manual smoke is the safety net. Each phase MUST execute the QA matrix before commit.
7. **Tooling availability** — `npx tsx`, `npx knip` rely on packages resolvable at exec time. Phase 0 must confirm; otherwise pin them as devDependencies first.

## Verification (per phase)

- [ ] `npm run check:all` clean
- [ ] `npm run build` clean
- [ ] QA matrix table filled (all rows pass for the phase's surfaces)
- [ ] Knip: no new unused exports in `components/ui/*` or `components/badges/*`
- [ ] No new ARIA / hydration / nested-anchor warnings in console
- [ ] Phase deliverables block (raw count delta, exceptions, touched files) appended to plan

## Phase 4 — analysis tables (2026-04-25)

### Surfaces touched
- `src/components/explore/OrthogroupDiffRow.tsx` — emits `TableRow / TableCell`; OG selector → `Button variant="link" size="xs"`
- `src/components/explore/OrthogroupDiffTable.tsx` — search → `Input`; result table → `Table density="dense"` with shadcn `TableHeader / TableBody / TableHead / TableRow`. SortButton extracted to its own file (`OrthogroupDiffSortButton.tsx`) using `Button variant="secondary|outline" size="xs"` so the page stays under the 300-line cap (final 280 lines). Inline `✕` clear glyphs (search + category) kept raw with `// raw:` annotation
- `src/components/explore/OrthogroupDiffSortButton.tsx` (new) — `Button`-based sort toggle, replaces in-file SortButton helper
- `src/components/analysis/BlockCandidateTable.tsx` — full migration to dense `Table`; candidateType pill → `Badge variant="secondary"`
- `src/components/analysis/CrossTraitBlockCompare.tsx` — outer table + Row → dense `Table` / `TableRow / TableCell`. Top-OG indigo chips kept inline (per-row dense list, fits the table)
- `src/components/explore/OgDrawerAlleleFreqSection.tsx` — table + VariantRow → dense `Table`; event-class pill → `Badge variant="outline"` with class-based tone
- `src/pages/AnalysisBlockListPage.tsx` — min-OG-count `<input>` → `Input`; FilterChips toggles → `Button variant="secondary|outline" size="xs"`; main blocks table → dense `Table`

### Raw count delta
| | Phase 3 end | Phase 4 end | delta |
|---|---|---|---|
| `<button>` | 34 | 31 | **−3** (FilterChips, SortButton, OG row link) |
| `<table>` | 10 | 5 | **−5** (OrthogroupDiffTable, BlockCandidateTable, CrossTraitBlockCompare, OgDrawerAlleleFreqSection, AnalysisBlockListPage) |
| `<input>` | 10 | 8 | **−2** (OrthogroupDiffTable search, AnalysisBlockListPage min-count) |
| `// raw:` annotations | 5 | 7 | +2 (search-clear ✕, category-clear ✕) |

Cumulative from baseline: button 51→31 (−39 %), table 14→5 (−64 %), input 15→8 (−47 %).

### Allowed-raw exceptions (new this phase)
- `OrthogroupDiffTable.tsx` — two inline `✕` clear glyphs (search field + category filter). Reason: shadcn `Button` is too padded for an inline 1-character glyph adjacent to an Input. `// raw: inline ✕ clear button …`

### QA matrix run (manual smoke target)
| Route | Key check | Pass |
|---|---|---|
| `/analysis/:run/orthogroups` | sort toggle (OrthogroupDiffSortButton), search input + ✕ clear, dense table renders 20 rows, click row → /og/:id?trait | TBD |
| `/analysis/:run/blocks` | filter chips (Button variants), min-OG-count Input, dense block list, row click → block detail | TBD |
| `/analysis/:run/candidate/:id` | BlockCandidateTable dense rendering, candidate-type Badge | TBD |
| `/analysis/:run/block/:id` | CrossTraitBlockCompare dense table | TBD |
| `/og/:id?trait=…` (drawer) | OgDrawerAlleleFreqSection dense table with AfBar in cells | TBD |

### Verification
- `npm run check:all` ✓ (lint + tsc + arch + manifest + cross-language + pytest 32/32)
- `npm run build` ✓
- File-size cap held: OrthogroupDiffTable 280 / 300

## Phase 3 — entity browse (2026-04-25)

### Surfaces touched
- `src/components/badges/SvOverlapBadge.tsx` (moved from `gene/`) — refactored to use `Badge variant="warning"` (strong) and `Badge variant="outline"` (weak). Old `gene/SvOverlapBadge.tsx` deleted.
- `src/components/gene/TraitHitBadges.tsx` — refactored to compose `TraitHitBadge` per hit instead of inlining the chip render
- `src/components/gene/GeneSearchResultList.tsx` — `Show 50 more` / `Show all` → `Button variant="outline" size="xs"`; updated SvOverlapBadge import
- `src/pages/GeneSearchPage.tsx` — search input → `Input`
- `src/pages/OrthogroupIndexPage.tsx` — search → `Input`; result table → `Table density="dense"` with shadcn `TableHeader / TableBody / TableRow / TableHead / TableCell`. Validates the dense Table variant on a real `colgroup`-ed surface
- `src/components/explore/OgIndexRow.tsx` — emits `TableRow / TableCell` instead of raw `<tr>`/`<td>`; tier pill → `TierBadge`
- `src/pages/OgDetailPage.tsx` — Anchor-locus disclosure toggle kept raw with `// raw:` (full-width title+caret layout doesn't fit Button)
- `src/components/og-detail/OgDetailAlleleFreqTab.tsx` — two action buttons → `Button variant="outline"`
- `src/components/og-detail/ClusterContextCard.tsx` — `View IRGSP reference` toggle → `Button` (variant flips on selected); wide row-selector kept raw with `// raw:` annotation
- `src/components/og-detail/OgCultivarCopyMap.tsx` — full table migration to dense `Table`; `PavStateBadge` → `Badge variant="outline"`
- `src/components/og-detail/OgIntersectionsSection.tsx` — full table migration to dense `Table`; `Show all/only N` → `Button variant="link" size="xs"`

### Raw count delta
| | Phase 2 end | Phase 3 end | delta |
|---|---|---|---|
| `<button>` | 40 | 34 | **−6** |
| `<table>` | 13 | 10 | **−3** |
| `<input>` | 12 | 10 | **−2** |
| `// raw:` annotations | 3 | 5 | +2 |
| amber/red/green pill class strings | 32 | 34 | +2 |

The pill-class count is fuzzy: it counts grepped color class strings (`border-amber-200 bg-amber-50` etc), so converting a raw `<span>` to a `<Badge>` that keeps the same color classes via `className` does NOT decrease the count. The semantic layer ratio (Badge / wrapper component vs. raw inline `<span>`) is the metric that matters; harder to count programmatically — flag for a manual audit at Phase 6.

### Allowed-raw exceptions (new this phase)
- `OgDetailPage.tsx:239` — full-width section disclosure toggle (`Anchor-locus variants` h3 + Hide/Show caret in one row). `// raw:` annotated.
- `ClusterContextCard.tsx:219` — wide row-selector with flex-wrap rich content + selected-ring state. `// raw:` annotated.

### QA matrix run (manual smoke target)
| Route | Key check | Pass |
|---|---|---|
| `/og` | category strip filter, preset toggle (raw chips), search Input, paginated Table renders, click row → /og/:id | TBD |
| `/og/:id?trait=…` | TierBadge in header, ClusterContextCard `View IRGSP reference` toggle, OgCultivarCopyMap dense table, OgIntersectionsSection dense table + Show all toggle | TBD |
| `/genes?q=baegil` | Input focus ring, result list with Trait/SV badges, `Show 50 more` Button | TBD |
| `/genes?q=PF00069` | Functional path renders the same result list with badges | TBD |

### Verification
- `npm run check:all` ✓
- `npm run build` ✓

## Phase 2 — auth/admin/header (2026-04-25)

### Surfaces touched
- `src/components/layout/Header.tsx` — Sign Out / Login → `Button` (Login uses `render={<Link to="/login" />}` for navigation)
- `src/pages/LoginPage.tsx` — submit + mode-switch + Google sign-in buttons → `Button`. Inputs were already shadcn `Input`
- `src/pages/AdminPage.tsx` — `+ Add Cultivar` → `Button`
- `src/components/admin/CultivarTable.tsx` — full migration to `Table / TableHeader / TableBody / TableRow / TableHead / TableCell`. Edit/Delete row actions → `Button` (`size="xs"`, custom green tone for Edit; `variant="destructive"` for Delete). Validates default-density `Table` on a small admin surface.
- `src/components/admin/CultivarForm.tsx` — text/number inputs → `Input`; submit + cancel + `NumInput` → `Button` / `Input`
- `src/components/admin/GenomeUploadPanel.tsx` — Upload button → `Button`
- `src/components/admin/OrthofinderUploadPanel.tsx` — Upload & Compute → `Button`

### Raw count delta
| | before | after | delta |
|---|---|---|---|
| `<button>` | 51 | 40 | **−11** |
| `<table>` | 14 | 13 | **−1** |
| `<input>` | 15 | 12 | **−3** |
| `<select>` | 2 | 2 | 0 |
| button-styled `<Link>` | 17 | 16 | **−1** (Header Login → `Button render={<Link/>}`) |

### Allowed-raw exceptions (new this phase)
- `CultivarForm.tsx:131` — `<input type="checkbox">` BLB resistance toggles. Reason: shadcn `Checkbox` primitive not installed; defer to Phase 5 if user opts to add it. `// raw: shadcn Checkbox primitive not installed (Phase 5 follow-up).`
- `GenomeUploadPanel.tsx:64` — `<input type="file">` with `file:*` pseudo-class styling. shadcn `Input` would conflict with the file picker. `// raw: file input with file:* pseudo-classes — shadcn Input would fight the file picker styling; kept raw on purpose.`
- `OrthofinderUploadPanel.tsx:129` — same file-input rationale.

### QA matrix run (manual)
| Route | Auth | Key check | Pass |
|---|---|---|---|
| `/login` | guest | submit + Google + mode switch + Input focus ring | TBD (smoke locally) |
| `/admin` | admin | + Add Cultivar opens form, Edit/Delete buttons, table renders all 11 cultivars | TBD |
| `/admin` (form) | admin | text + number Inputs accept input, BLB checkbox still works, Cancel/Save buttons | TBD |
| Header (any route) | logged-in | Sign Out button visible, click signs out | TBD |
| Header (any route) | guest | Login button visible, click → /login | TBD |

### Verification
- `npm run check:all` ✓
- `npm run build` ✓ (389 ms)

## Phase 1 — API decisions (2026-04-25)

### Button — Link integration
Base UI's `Button` primitive accepts a `render` prop (verified via `node_modules/@base-ui/react/utils/types.d.ts:32`). Pattern for navigation buttons:

```tsx
<Button render={<Link to="/foo" />}>Label</Button>
```

`asChild` is NOT exposed by base-ui — `render` is the canonical mechanism. All button-styled `<Link>` migrations use this pattern.

### Badge — generic-only variants
`src/components/ui/badge.tsx` extended with two project-generic semantic variants:
- `success` — green (`border-green-200 / bg-green-50 / text-green-800`)
- `warning` — amber (`border-amber-200 / bg-amber-50 / text-amber-800`)

Pre-existing variants (`default | secondary | destructive | outline | ghost | link`) untouched. **No domain variants** (no `tier-private`, `trait`, `sv` etc.) — those would duplicate the canonical helpers in `src/lib/og-conservation.ts`. Domain palettes live in wrappers, not in the primitive.

### Domain badge wrappers — new files
- `src/components/badges/TierBadge.tsx` — composes `Badge variant="outline"` with `tierTone()` className. Single tier prop.
- `src/components/badges/TraitHitBadge.tsx` — composes `Badge variant="warning"` + `render={<Link …>}`. One hit per chip; consumer builds the list. Replaces the loop currently inlined in `TraitHitBadges.tsx`.
- `src/components/gene/SvOverlapBadge.tsx` — refactor in Phase 3 (currently lives in gene/ and uses raw `<span>`; will move to badges/ + use `Badge variant="warning"` for strong, `variant="outline"` for weak).

### Table — density variant
`src/components/ui/table.tsx` extended with a `density?: 'default' | 'dense'` prop on `Table`. Sets `data-density` attribute on the inner `<table>`; `TableHead` and `TableCell` react via `in-data-[density=dense]:` Tailwind v4 selectors:
- `TableHead`: `h-10 → h-7`, adds `py-1`, `whitespace-nowrap → whitespace-normal`
- `TableCell`: drops `p-2` → `py-1`, `whitespace-nowrap → whitespace-normal`

Verifies on `OrthogroupDiffTable` in Phase 4. If shadcn defaults are good enough for non-dense tables, regular consumers omit the prop.

### Verification
- `npm run check:all` ✓
- `npm run build` ✓ (386 ms)
- No consumer file changes — Phase 2+ migrate consumers.

## Result (fill on completion)
- Status: TBD
- Phases done: 0 (DropdownMenu baseline) · 1 (API design) — see commit history
- Final raw counts (button / table / pill / input / select / button-styled-Link): TBD
- Allowed-raw exceptions (final list): TBD
- Notes: TBD

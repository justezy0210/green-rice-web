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

## Result (fill on completion)
- Status: TBD
- Phases done: TBD
- Final raw counts (button / table / pill / input / select / button-styled-Link): TBD
- Allowed-raw exceptions (final list): TBD
- Notes: TBD

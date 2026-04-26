# AGENTS.md - Green Rice Web

This file is the Codex-facing project guide. Keep it in sync with
`CLAUDE.md`; when the two differ, prefer the more specific project rule and
update both files when practical.

## Product Frame

Green Rice Web is an entity-centered comparative pan-genome resource for
16 Korean temperate japonica cultivars. The primary browsing entities are:

1. Cultivar / Gene / Orthogroup / Region
2. Trait Association as a secondary overlay/module

Avoid trait-first framing unless the user explicitly works inside the
analysis module.

Do not describe evidence as validated, causal, marker-ready, MAS/GS-ready,
or representative of all Korean rice. Anchor-locus allele frequency must not
be shown as OG-level evidence unless the tier gating supports that reading.

Allowed PAV language: evidence-graded states such as
`present-complete`, `present-fragmented`, `absent-syntenic-deletion`,
`absent-annotation-missing`, `duplicated`, and `ambiguous`, with the evidence
visible and a "not validation-grade" label.

## Tech Stack

- React 19 + TypeScript 5 strict + Vite 8
- Tailwind CSS v4 + shadcn/ui
- Chart.js 4 through `react-chartjs-2`
- Firebase 12: Auth, Firestore, Storage
- React Router 7

## Architecture Rules

Dependency direction is mandatory:

```text
Types -> Lib -> Hooks -> Components -> Pages
```

- `src/types/`: pure types only; no imports from higher layers
- `src/lib/`: services and utilities; may import Types only
- `src/hooks/`: React hooks; may import Types + Lib only
- `src/context/`: global state; may import Types + Lib + Hooks
- `src/components/`: UI; must not import Pages
- `src/pages/`: route entries; may import lower layers

Run `npm run check:arch` when changing imports or file ownership.

## File Conventions

- Components: `PascalCase.tsx`
- Hooks: `use*.ts`
- Services: `kebab-case.ts`
- Types: `kebab-case.ts`, PascalCase interfaces
- Keep files at or below 300 lines unless there is a strong reason
- Use `@/` imports rather than deep `../../` paths

## Implementation Rules

1. Never hardcode secrets. Use `import.meta.env.VITE_*` and update
   `.env.example` when adding env vars.
2. Do not commit `.env`.
3. Keep types in `src/types/`, env setup in `src/lib/firebase.ts`, and deeper
   design records under `docs/`.
4. Keep data fetching in hooks/services and rendering in components.
5. Use chart wrappers under `src/components/charts/*Wrapper.tsx`; do not use
   Chart.js directly in pages/components.
6. Code-facing strings must be English: UI copy, errors, logs, comments,
   variable names. Korean is allowed in documentation files such as
   `docs/`, `CLAUDE.md`, and `AGENTS.md`.
7. Prefer existing local primitives and domain helpers before adding new
   abstractions.
8. For non-trivial work, create an execution plan under
   `docs/exec-plans/active/` before editing, then move it to
   `docs/exec-plans/completed/` with results when done.

## Key Commands

```bash
npm run dev
npm run build
npm run lint
npm run type-check
npm run check:arch
npm run check:all
```

Other useful checks:

```bash
npm run check:cross-language
npm run check:py
npm run check:og-region-bundle
```

## Data Flow

```text
Firestore -> src/lib/*-service.ts -> src/hooks/use*.ts -> Components
```

Examples:

- `data-service.ts`: phenotype data CRUD
- `cultivar-service.ts`: cultivar data CRUD
- `genome-upload-service.ts`: genome upload pipeline

## Documentation Map

- `docs/product-specs/scope.md`: identity and framing lock
- `docs/ARCHITECTURE.md`: system overview
- `docs/references/dependency-layers.md`: layer rules
- `docs/exec-plans/`: active/completed implementation plans
- `docs/runbooks/`: operational release playbooks
- `docs/generated/`: generated references

## Working Notes For Codex

- Read the relevant local code before assuming behavior.
- Preserve user or other-agent changes; do not revert unrelated work.
- Use focused edits and verify with the smallest sufficient command set.
- If `npx tsx` checks fail because of sandboxed network resolution, rerun the
  same npm script with escalated network permission rather than replacing the
  check.

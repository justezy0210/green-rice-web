# Tech Debt Tracker

Known technical debt and improvement opportunities.

## Active

| ID | Area | Description | Priority | Added |
|----|------|-------------|----------|-------|
| TD-001 | components | PhenotypeDistributionChart has mixed concerns (URL state, sorting, chart selection, navigation) | Medium | 2026-04-14 |
| TD-002 | types | Some type definitions could be more strict (excessive `null` unions) | Low | 2026-04-14 |

## Resolved

| ID | Area | Description | Resolved | Notes |
|----|------|-------------|----------|-------|
| TD-R001 | types | Runtime functions in src/types/ (emptyCultivarForm, etc.) | 2026-04-14 | Moved to src/lib/*-helpers.ts |
| TD-R002 | pages | CultivarDetailPage.tsx exceeded 300-line limit (388 lines) | 2026-04-14 | Split into GenomeRadarSection, GenomeTableSection, MiniSearch |
| TD-R003 | lib | Firebase calls missing try-catch error handling | 2026-04-14 | Added try-catch to all service functions |
| TD-R004 | admin | GenomeUploadPanel not connected to AdminPage | 2026-04-14 | Wired into edit mode |
| TD-R005 | hooks | usePhenotypeData cache could not be invalidated | 2026-04-15 | Added `invalidateCache()` + `refresh()` |
| TD-R006 | types | cultivarId was not exposed in PhenotypeRecord | 2026-04-15 | Added `cultivarId` field for grouping join |

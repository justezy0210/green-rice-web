# About Assembly Only Origin Map

## Goal

Remove the rice-consumption ranking and replace the 3K resequencing origin map
with an assembly-level origin map built from published long-read rice pangenome
assemblies.

## Plan

1. Remove rice-consumption data constants and the UI panel.
2. Remove the 3K resequencing panel as a map source.
3. Use Shang et al. 2022 Table S1a, which lists 251 nanopore-sequenced rice
   accessions with `Original area`, as the assembly-level country source.
4. Normalize country labels and exclude non-country/unknown labels from the
   displayed count.
5. Run lint, type-check, architecture check, build, and diff whitespace check.

## Result

- Removed the rice-consumption ranking panel from the About page.
- Removed all 3K/resequencing-derived map data from the UI source files.
- Downloaded Shang et al. 2022 supplemental Table S1a and used its
  assembly-level `Original area` field for the map.
- Displayed 249 normalized assembly accessions across 42 country labels;
  `Unknown` and `Soviet Union` were excluded, and spelling variants such as
  `Phillipines`, `Sri lanka`, `Burma`, and `Ivory Coast` were normalized.
- Kept other published rice pangenome resources as a separate comparison panel
  rather than merging cohorts and risking duplicate assembly counts.

## Verification

- `npm run lint`
- `npm run type-check`
- `npm run check:arch`
- `npm run build`
- `curl -I http://localhost:5173/about`
- `git diff --check`

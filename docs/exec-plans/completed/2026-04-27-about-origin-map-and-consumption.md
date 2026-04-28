# About Origin Map And Consumption Context

## Status

Superseded by `2026-04-27-about-assembly-only-origin-map.md`. The interim
version used 3K resequencing metadata and a rice-consumption panel; both were
removed because the About page should use assembly-level pangenome data only.

## Goal

Revise the About page so the global assembly visualization counts countries by
verified cultivar/accession origin rather than BioSample sampling metadata, add
rice-consumption context, and account for published rice pangenome cohorts that
are not cleanly represented by the NCBI assembly-country snapshot.

## Plan

1. Check published rice pangenome resources with web sources and capture cohort
   size/country-scope claims separately from NCBI metadata.
2. Use a conservative country-count basis: include only curated examples whose
   cultivar/accession origin is interpretable; do not count Korean sampling
   sites as Korean cultivar origin.
3. Add a rice consumption ranking visualization using a documented FAOSTAT-based
   source and keep it clearly separate from genomic resource availability.
4. Rework the About page map and side panels so the visual itself carries the
   data instead of relying on explanatory caution text.
5. Run lint, type-check, architecture check, build, page smoke check, and diff
   whitespace check.

## Result

- Replaced the About-page BioSample country map with a 3K Rice Genomes
  `ORI_COUNTRY` origin map.
- Parsed the 3K supplemental Table S1A/S1B locally and normalized country labels
  by spelling/case; the displayed snapshot counts 2,957 accessions across 96
  country labels and excludes 11 non-country labels.
- Added a rice consumption ranking panel using FAOSTAT-based 2023 kg/person/year
  values, with South Korea highlighted separately from the top ten.
- Added a literature cohort panel for major rice pangenome resources not suitable
  for direct NCBI BioSample-country counting.
- Split About visual panels into `src/components/about/AboutResourcePanels.tsx`
  to keep the route file below the project line-count guideline.

## Verification

- `npm run lint`
- `npm run type-check`
- `npm run check:arch`
- `npm run build`
- `curl -I http://localhost:5173/about`
- `curl -I https://upload.wikimedia.org/wikipedia/commons/5/51/BlankMap-Equirectangular.svg`
- `git diff --check`

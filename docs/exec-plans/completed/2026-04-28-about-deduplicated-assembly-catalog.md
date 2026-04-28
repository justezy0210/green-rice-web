# About Deduplicated Assembly Catalog

## Goal

Replace the single-cohort assembly-origin map with a conservative deduplicated
assembly-level rice accession catalog built from multiple published pangenome or
long-read assembly resources.

## Plan

1. Collect accession-level supplementary tables for accessible assembly-level
   rice pangenome papers.
2. Build a conservative canonical key for each biological accession/cultivar:
   normalized name plus species and origin country, with source accession IDs
   retained as aliases.
3. Merge exact same canonical accessions across sources, but do not merge
   derivative lines or ambiguous aliases without strong evidence.
4. Update the About map copy and counts to say it is a curated deduplicated
   literature catalog, not a complete world census.
5. Run lint, type-check, architecture check, build, route smoke check, and diff
   whitespace check.

## Result

- Replaced the single Shang et al. 2022 map with Guo et al. 2025 Supplementary
  Table 17, which summarizes recent Oryza pangenome samples across multiple
  assembly-level resources.
- Treated the table as the deduplicated literature catalog source and verified
  there were no duplicate sample keys after normalized sample-name checks.
- Counted 510 sample rows from the table after excluding the 5 reference-footnote
  rows present at the bottom of the sheet.
- Displayed 503 country-coded records across 47 normalized country labels.
- Excluded 7 rows whose country values were `Unknown`, `IRRI`, or
  `Soviet Union`.
- Updated the About hero copy to remove the vague "beyond a single reference
  genome" phrase.

## Verification

- `npm run lint`
- `npm run type-check`
- `npm run check:arch`
- `npm run build`
- `curl -I http://localhost:5173/about`
- `git diff --check`

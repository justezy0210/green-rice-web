# Discovery primary impact classes

Status: completed — 2026-04-27

## Goal

Use only primary genomic impact classes for OG x SV evidence. Discovery should
not mix contextual labels such as local cluster, CNV support, inversion boundary,
or TE association into the main `impactClass` field.

## Impact Classes

Primary impact classes:

- `coding_or_splice` — SV footprint overlaps CDS or canonical splice site.
- `utr` — SV footprint overlaps UTR exon only.
- `intron` — SV footprint overlaps intronic gene body only.
- `promoter_2kb` — strand-aware proximal upstream window.
- `upstream_2_10kb` — strand-aware upstream context outside promoter.
- `downstream_2kb` — strand-aware downstream context.
- `intergenic` — reserved for future nearby non-gene records; not emitted by the
  current OG-member interval scan unless a bounded nearby policy is added.

## Non-Goals

- Do not add local cluster as an impact class.
- Do not add TE/repeat or CNV/inversion context flags in this pass.
- Do not claim functional causality from primary impact classes.
- Do not rewrite uploaded historical analysis artifacts in this pass.

## Implementation

Completed:

1. Updated the raw analysis GFF parser so selected OG member genes include
   exon/CDS-derived intervals, not only gene bbox.
2. Emit OG x SV intersections with the primary impact classes above.
3. Rank best SV hits by primary impact severity plus group-frequency gap.
4. Updated promotion validators and TypeScript unions to accept the new classes
   while keeping legacy classes readable for existing artifacts.
5. Updated UI labels so legacy `gene_body` is visibly treated as old broad
   evidence, not a precise primary impact.

## Validation

- `python3 -m py_compile scripts/run-raw-analysis.py scripts/promote-analysis-run.py` passed.
- `npm run type-check` passed.
- `npm run lint` passed.
- `npm run check:arch` passed.
- `git diff --check` passed.
- `npm run build` passed with the existing Vite chunk-size warning.


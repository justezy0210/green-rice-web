# Allele Frequency per Orthogroup

Status: active — 2026-04-16

## Problem

Explore 페이지에서 candidate OG를 보면 "이 OG의 copy count가 그룹 간에 다르다"는 정보만 있다. 실제로 해당 OG의 IRGSP gene region에 어떤 variant가 있고, 그 allele frequency가 그룹 간에 어떻게 다른지 알 수 없다.

## Goal

OG 드로어에서 해당 OG의 IRGSP gene region에 있는 variant의 group별 allele frequency를 보여준다.

## Data Sources

| Source | Path | Description |
|--------|------|-------------|
| VCF | `data/green-rice-pg.vcf.gz` | Cactus pangenome, IRGSP ref, 11 samples, 1.7M variants |
| IRGSP GFF | `data/irgsp-1.0.gff` | 37,890 genes, chr01-12, gene → chr:start-end |
| OG descriptions | Storage `og_descriptions.json` | OG → IRGSP transcript IDs |

## Pipeline Design

### Step 1: Build IRGSP gene coordinate index

Parse `irgsp-1.0.gff` → `{geneId: {chr, start, end, strand}}`.
Transcript → gene mapping: `Os01t0100100-01` → `Os01g0100100` (regex: `Os\d{2}t` → `Os\d{2}g`).

### Step 2: Map OG → IRGSP gene regions

From `og_descriptions.json`:
- OG → IRGSP transcripts → gene IDs → chr:start-end regions
- One OG may have multiple IRGSP genes (multiple regions to query)

### Step 3: Extract variants per region

For each OG's gene region(s), extract VCF variants:
- Parse VCF row by row (gzipped streaming)
- For each variant in a gene region: extract GT per sample
- Compute: REF allele count, ALT allele count per group

### Step 4: Compute group-level allele frequency

For each variant position, given grouping assignments (e.g., heading_date early vs late):
- AF_group1 = ALT count in group1 / (2 × n_group1)   (diploid)
- AF_group2 = ALT count in group2 / (2 × n_group2)
- delta_AF = |AF_group1 - AF_group2|
- Fisher's exact or chi-square test (optional, n is small)

### Step 5: Pre-compute per-trait output

For each trait's grouping:
- For each candidate OG with IRGSP genes:
  - List of variants with per-group AF
  - Summary: total variants, high-delta variants (delta_AF > 0.5), variant types

Output: `og_allele_freq/{traitId}.json`

```typescript
interface OgAlleleFreqPayload {
  schemaVersion: 1;
  traitId: string;
  orthofinderVersion: number;
  groupingVersion: number;
  computedAt: string;
  ogs: Record<string, OgVariantSummary>;
}

interface OgVariantSummary {
  geneRegions: { geneId: string; chr: string; start: number; end: number }[];
  totalVariants: number;
  variants: VariantEntry[];  // top N by delta_AF, capped to avoid huge payload
}

interface VariantEntry {
  chr: string;
  pos: number;
  ref: string;
  alt: string;
  afByGroup: Record<string, number>;  // groupLabel → AF
  deltaAf: number;
}
```

### Step 6: Upload to Storage

Path: `og_allele_freq/{traitId}.json` (overwritten per recompute).
Storage rules: same as `orthogroup_diffs/{path=**}` — public read, server write only.

### Step 7: Frontend

- New hook: `useOgAlleleFreq(traitId)` → fetch + cache
- OG drawer: new "Allele Frequency" section below cultivar sections
  - Summary: "X variants in Y gene regions, Z with |ΔAF| > 0.5"
  - Top variants table: chr:pos, ref/alt, AF per group, delta AF
  - Optional: mini AF comparison bar chart

## Implementation

### Execution approach

Pre-compute script (Python, runs locally or as Cloud Function):
1. Load IRGSP GFF → gene coordinate index
2. Load og_descriptions.json → OG → gene mapping
3. Load groupings from Firestore → per-trait group assignments
4. Stream VCF once, index variants by chr:pos
5. For each trait × each candidate OG → extract region variants → compute AF
6. Write output JSONs → upload to Storage

### Why local script (not Cloud Function)

- VCF is 97MB — too large for Cloud Function memory/timeout
- One-time computation, re-run when VCF or grouping changes
- Can run from dev machine with `firebase-admin` service account

## Tasks

1. [ ] Python script: parse IRGSP GFF → gene index
2. [ ] Python script: map OG → gene regions
3. [ ] Python script: stream VCF → variant extraction per region
4. [ ] Python script: compute group AF + write output JSONs
5. [ ] Upload outputs to Storage
6. [ ] Storage rules update (if needed)
7. [ ] Frontend: types + service fetch + hook
8. [ ] Frontend: OG drawer allele frequency section
9. [ ] Test with heading_date trait end-to-end

## Constraints

- VCF samples = 11 (not all 16 cultivars). Some cultivars in grouping may not be in VCF → exclude from AF calculation
- Diploid assumption for AF (GT field parsing: 0/0, 0/1, 1/1)
- Cactus VCF may have multi-allelic sites → handle ALT with commas
- Variant cap per OG: top 50 by delta_AF to limit payload size
- Gene region padding: ±0bp (exact gene boundary) initially, can add upstream/downstream later

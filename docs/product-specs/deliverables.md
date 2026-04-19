# Deliverables — What this DB actually provides

> "Phenotype 그룹을 갈라놓는 후보 유전요소를 20분 안에 좁혀주고, 검증 실험으로 가져갈 수 있는 정보 (OG ID, 좌표, cultivar 분포) 를 손에 쥐여주는 DB."

Companion doc to [`scope.md`](scope.md) and [`idea.md`](idea.md). Where `scope.md` defines boundaries and `idea.md` defines vision, this doc is the concrete **deliverables view**: what a user actually leaves a session with.

## What the user gets in a single session

### 1. Trait-ranked candidate OG list

- 9 traits × one ranked list each
- Mann-Whitney U on OG copy count between proposed phenotype groups, with Cliff's delta as effect size
- LLM-proposed functional category labels
- Currently ~1000 OGs surfaced as candidates across all traits

### 2. Multi-modal evidence per candidate OG

When the user opens a candidate:

- **Cultivar gene locations** — per cultivar, which chromosome / coordinates the annotated OG members sit at
- **IRGSP reference gene location** — if the OG is linked to an IRGSP transcript
- **Cluster structure** — tandem / dispersed / singleton summary per cultivar
- **Same-chromosome presence count per group** — e.g. "early 8/8 · late 2/5"
- **Cluster-region variants** — when a cluster is selected, SNP / indel / SV-like rows in the lifted IRGSP window with per-group AF
- **Pangenome graph** — cluster-derived tube map with cultivar paths and annotation overlay (`✓ annotated here`, `⊘ elsewhere`, `⊘ no member`)

### 3. Panel context

- 9 trait × 16 cultivar phenotype distributions
- GMM-proposed groupings (labelled as *proposed*, not ground truth)
- Trait coverage / quality overview

### 4. Cultivar profiles

- Phenotype values per cultivar
- Cross information / registration metadata
- Genome FASTA + GFF download
- Phenotype table view

### 5. Reference data access

- IRGSP-1.0 annotation coordinates
- OrthoFinder OG structure (representative transcripts, descriptions)

## Questions the DB answers

| Question | Where |
|----------|-------|
| "What orthogroups separate early vs late heading date cultivars in this panel?" | Explore |
| "Where is OG0000987 annotated across the 16 cultivars?" | OG Detail → Gene Locations |
| "What variants sit in the IRGSP window of this OG's selected cluster, and how do they distribute across phenotype groups?" | OG Detail → Gene-region Variants |
| "How do cultivar paths differ structurally at this cluster?" | OG Detail → Pangenome Graph |
| "What traits are baegilmi measured for and where does it sit in each distribution?" | Dashboard + Cultivar Detail |
| "Which traits have enough data for grouping at all?" | Dashboard → Trait Quality Overview |
| "What's the IRGSP representative transcript for this OG?" | OG Detail header |

## What the DB does NOT provide (explicit)

- ❌ KASP / CAPS / InDel primer design
- ❌ Validated PAV / pseudogene calls
- ❌ Causal variant / driver gene confirmation
- ❌ MAS / GEBV / breeding decision support
- ❌ Variant functional impact (synonymous / missense / nonsense / frameshift) classification
- ❌ BLAST-based sequence validation at candidate loci
- ❌ Expression evidence (RNA-seq, qPCR)
- ❌ Regulatory / promoter variant analysis (default window is gene body only)
- ❌ Generalization beyond the 16-cultivar Korean temperate japonica panel
- ❌ Population-level statistical significance

If one of these is needed, the DB is the **starting point** — the downstream work happens elsewhere in the user's own lab / tooling.

## Niche — why this DB vs existing tools

| Tool | Primary value | Gap we fill |
|------|--------------|-------------|
| K-rice | Korean germplasm variant catalog | No pangenome; single-reference only |
| SNP-Seek | 3K accession SNP browse | Weak coverage of Korean elite temperate japonica |
| RAP-DB | IRGSP reference annotation | No cultivar comparison |
| RiceSuperPIRdb / super pangenome | 251-accession SV/PAV | No phenotype linkage, Korean cultivars absent |
| GWAS pipelines | Population-level association | Require population samples our panel can't support |

**Our unique position**: the only tool that takes the 16 Korean temperate japonica pangenome and turns it into a phenotype-group-based candidate list using copy count + AF + graph context — with explicit honesty about what "candidate" means.

## A concrete user flow

**Kim, trait biologist, interested in early-heading candidate genes**:

1. Opens `/explore`, selects `heading_date`
2. Scans the candidate OG table (20 per page, ~1000 total)
3. Opens 2–3 OGs of interest
   - Gene Locations — notes which cultivars carry the member on which chromosome
   - Gene-region Variants — glances at whether any visible variants sit in the lifted IRGSP window
   - Pangenome Graph — checks structural context
4. Writes down: OG IDs, IRGSP transcript IDs, cultivar coordinate list, cluster anchor
5. Back in their lab: BLAST, RT-qPCR, marker design, ORF inspection — none of which happens in the DB

**The DB supports steps 1–4. Step 5 is user's own work.**

## Honesty about what this means scientifically

- A "candidate" here is a **ranked hypothesis**, not a validated finding
- The ranking metric (copy count MWU) is one defensible choice, not the only one
- AF and graph are **supporting evidence layers**, not additional rankers
- Users who read the DB correctly walk away with prioritized leads. Users who read it incorrectly might think they've found the answer.
  - The UI (ScopePanel, badges, caveats) is designed to prevent the latter; some responsibility remains on the user.

## One-sentence summary

**A Korean temperate japonica pangenome discovery tool that surfaces phenotype-group-distinguishing candidate genetic elements, presents them with layered evidence, and stops at the boundary where hypothesis generation ends and validation should begin.**

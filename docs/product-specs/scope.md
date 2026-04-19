# Scope — Phenotype-Driven Candidate Discovery DB (locked 2026-04-18)

## Declaration

> **"이 리소스는 16개 한국 temperate japonica 품종에서 형질 그룹을 구분하는 후보 유전자 및 유전체 요소를 orthogroup, 변이, 그래프 기반 증거로 우선순위화해 제시하는 표현형 기반 후보 발견 데이터베이스이며, 후속 생물학적 검증의 출발점을 제공한다."**
>
> "This resource is a Korean temperate japonica phenotype-driven candidate discovery database that prioritizes candidate genes and genomic elements distinguishing trait groups across 16 cultivars using orthogroup, variant, and graph-based evidence, as a starting point for downstream biological validation."

This sentence is the single point of identity. Every landing surface (README, idea.md, introduction.md, Explore header, manuscript abstract) must stay consistent with it.

## Primary user

Trait biologist / QTL follow-up researcher / upstream (pre-MAS) breeder.

**Not** the primary user:
- Molecular breeders developing KASP / CAPS / InDel markers
- GS / GEBV / MAS operators
- Pangenome methods researchers
- Population geneticists seeking validated association signal

## What the DB CAN tell you

- Which orthogroups / variants / SVs differ between phenotype groups across the 16 Korean temperate japonica cultivars
- Annotated OG-member positions per cultivar
- Cluster-derived pangenome graph context and AF contrast per cluster
- Panel-scoped candidate ranking (Mann-Whitney U on copy count, per-group AF, cluster presence)
- Downloadable candidate tables and evidence for follow-up work

## What the DB CANNOT tell you

- Whether a candidate is causal for the trait
- Whether a cultivar with "no annotated member" truly lacks the gene
- Whether an annotated absence reflects biology or annotation quality
- Whether reported variants would work as KASP / CAPS / InDel markers
- Whether findings generalize beyond the 16-cultivar panel
- Whether a phenotype grouping auto-proposed by GMM reflects biological structure

## Strict exclusion list (do not build, do not claim)

- KASP / CAPS / primer design / flanking extraction packaging
- Parent-pair polymorphism as a primary task
- Marker recommendation, breeder-ready / deployment-ready artifacts
- MAS / GS / GEBV language
- Validated PAV / validated LoF / pseudogene confirmed calls
- Causal / driver / determinant language for candidates
- "Best marker", "top marker", "proven marker"
- "한국 벼 전체 대표" generalization
- Wet-lab QC claims (false-priming, assay suitability, Tm)
- Downstream assay conversion

Parent-pair marker workbench is a possible **separate future product**, not a module of this DB. Do not shape the DB so it can "grow into" it.

## Next recommended checks (what the DB points users toward)

When a user finds an interesting candidate here, standard follow-up is:

- Reference CDS → cultivar-assembly reverse search (BLAST / minimap2) to distinguish annotation gap from true absence
- ORF integrity inspection at the candidate locus in each cultivar of interest
- Promoter / 5' UTR / upstream variant scan (outside our default gene-body AF window)
- Expression validation (RNA-seq / qPCR) if available
- Wider-panel genotyping before treating a finding as a population-level claim

## Red flags to lint against (severity-ordered)

1. Candidates described as causes
2. 16-cultivar findings stated as general rules
3. GMM groups stated as biological truth instead of "proposed grouping"
4. Suppressed uncertainty in OG / PAV / SV calls
5. Pretty graphics that inflate apparent evidence strength
6. Ranking scores read as confirmation
7. Breeder-facing copy combined with missing marker-ready features
8. "Korean-specialized" claim without Korean-research-question grounding
9. Unclear annotation / coords / provenance / versioning
10. Negative cases hidden (traits where no strong candidate emerges)

## How to use this doc

- Before writing any new UI copy, plan, or README section, read the declaration + CAN/CANNOT sections.
- Before adding a feature, check it against the exclusion list. If it would violate, it belongs in a different product.
- Link to this doc from `CLAUDE.md` and from `docs/product-specs/idea.md`.

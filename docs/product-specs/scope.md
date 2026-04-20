# Scope — Korean Japonica Comparative Pangenome Resource (updated 2026-04-20)

> **Previously** this resource was locked (2026-04-18) as a *phenotype-driven candidate discovery DB*. Today (2026-04-20) the identity is reframed as **a comparative pangenome resource with candidate discovery as one analysis module**. The pivot follows a methodology review that found the previous phenotype-first framing over-represented locus-level evidence as OG-level claims. Entity units (Gene, OG, Cultivar, Region) are now first-class; phenotype association is a module, not the spine.

## Declaration

> **"이 리소스는 16개 한국 temperate japonica 품종의 de novo assembly, gene annotation, orthogroup, pangenome graph를 gene·orthogroup·cultivar·region 단위로 통합 탐색하는 비교유전체(pan-genome) 데이터베이스이며, 형질 그룹을 구분하는 후보 증거를 **별도 분석 모듈**로 함께 제공한다."**
>
> "This resource is a comparative pangenome database integrating de novo assemblies, gene annotations, orthogroups, and pangenome graph across 16 Korean temperate japonica cultivars, with phenotype-driven candidate evidence exposed as a **separate analysis module**."

This sentence is the single point of identity. Every landing surface (Dashboard hero, README, idea.md, manuscript abstract) must stay consistent with it. The trait module's copy is scoped per-module, not rolled up to the resource identity.

## Primary users

- **Comparative genomics researcher** — gene/OG/cultivar/region browsing across the 16-cultivar panel
- **Trait biologist / QTL follow-up / pre-MAS breeder** — phenotype association as one module within the resource

Both are first-class; neither framing subsumes the other.

**Not** the primary user:
- Molecular breeders developing KASP / CAPS / InDel markers
- GS / GEBV / MAS operators
- Population geneticists seeking validated association signals
- Pangenome methods researchers (we consume, not benchmark)

## What the DB CAN tell you

### At the entity layer (primary)

- Which genes each cultivar carries, with coordinates and functional annotation
- Which orthogroup a gene belongs to, and how copy count varies across 16 cultivars
- For an OG: anchor occupancy, copy architecture, cluster-level graph context, annotated member positions
- For a cultivar: assembly stats, annotation stats, private OGs
- For a region: pangenome graph structure, variants in that window
- Evidence-graded PAV state per OG × cultivar (see classes below)
- Non-reference Korean japonica sequences not captured by Nipponbare

### At the analysis module (overlay)

- Which OGs rank high for copy-count contrast between proposed phenotype groups
- Per-cluster AF at the anchor locus for a given trait — **only when anchor representativeness warrants** (see tier gating)
- Candidate tables for follow-up, with the evidence layer each claim rests on

## What the DB CANNOT tell you

- Whether a candidate is causal for a trait
- Whether an OG×cultivar "absence" is real deletion vs annotation missing (the state class distinguishes the evidence shown; it does not confirm the biology)
- Whether reported variants would work as KASP / CAPS / InDel markers
- Whether findings generalize beyond the 16-cultivar panel
- Whether a phenotype grouping auto-proposed by GMM reflects biological structure
- Whether an anchor-locus AF reflects OG variation or just locus sequence variation at that position — **the tier classification tells you which case applies**

## PAV evidence state — allowed vocabulary

Previously PAV language was banned entirely. The blanket ban pushed users into silent PAV-like inference from graph + AF combinations. The revised policy **allows evidence-graded state classification** while keeping validation claims banned.

Allowed classes (per OG × cultivar):

| Class | Meaning | What this does NOT claim |
|---|---|---|
| `present-complete` | Annotated OG member + syntenic support + complete gene model | Not a claim of full functional orthology |
| `present-fragmented` | OG member annotated but model partial | Not a claim of pseudogenization |
| `absent-syntenic-deletion` | Syntenic region present, no gene model, flanking support | Not a validated biological absence |
| `absent-annotation-missing` | Region exists, annotation absent, cannot distinguish | Explicitly non-conclusive |
| `duplicated` | Multiple OG members in this cultivar | Not a claim of functional divergence |
| `ambiguous` | Paralogy / assembly gap / mapping uncertainty | Curation escape hatch |

Each class requires **evidence disclosure** (which inputs support the classification) and carries a "not validation-grade" label.

## Strict exclusion list (do not build, do not claim)

- **Validated** PAV / LoF / pseudogene / causal / driver / determinant language
- "LoF confirmed" / "pseudogene confirmed" / "causal variant"
- KASP / CAPS / primer design / flanking extraction packaging
- Marker recommendation, breeder-ready / deployment-ready artifacts
- MAS / GS / GEBV language
- Parent-pair polymorphism as a primary workflow
- "Best marker", "top marker", "proven marker"
- "한국 벼 전체 대표" generalization
- Wet-lab QC claims (false-priming, assay suitability, Tm)
- Downstream assay conversion

**Parent-pair marker workbench is a possible separate future product, not a module of this DB.** Do not shape the DB so it can "grow into" it.

## Anchor-locus AF — tier gating policy

Per-cluster anchor-locus AF is useful only when the anchor position genuinely represents the OG across cultivars. Every OG cluster is classified into one of three tiers:

- **representative** — ≥70% of cultivars have their OG member at the anchor position, ≤20% elsewhere
- **mixed** — 40–70% occupancy OR >20% elsewhere
- **nonrepresentative** — <40% occupancy

UI behavior per tier:

| Tier | AF panel display |
|---|---|
| representative | Shown normally. Title: `Anchor-locus variants` |
| mixed | Demoted. Aggregate hidden by default. Per-cultivar detail requires reveal. Strip warns "locus-local evidence, not OG-wide". |
| nonrepresentative | Hidden by default. Opens only on explicit user request with explanation that the anchor does not represent the OG. |

Thresholds are initial estimates. Refinement with real data is expected during Stage 2.

## Next recommended checks (what the DB points users toward)

When a user finds an interesting candidate, standard follow-up is still:

- Reference CDS → cultivar-assembly reverse search (BLAST / minimap2) to distinguish annotation gap from true absence
- ORF integrity inspection at the candidate locus in each cultivar of interest
- Promoter / 5' UTR / upstream variant scan
- Expression validation (RNA-seq / qPCR) if available
- Wider-panel genotyping before treating a finding as a population-level claim

## Red flags to lint against (severity-ordered)

1. Candidates described as causes / drivers / determinants
2. 16-cultivar findings stated as general rules
3. GMM groups stated as biological truth instead of "proposed grouping"
4. Anchor-locus AF shown as OG-level evidence without tier gating
5. PAV state class presented as validated biological call
6. Suppressed uncertainty in OG / PAV / SV calls
7. Pretty graphics that inflate apparent evidence strength
8. Ranking scores read as confirmation
9. Breeder-facing copy combined with missing marker-ready features
10. "Korean-specialized" claim without Korean-research-question grounding
11. Unclear annotation / coords / provenance / versioning
12. Negative cases hidden (traits where no strong candidate emerges)

## Information architecture — entity spine

The spine of the resource is the entity graph, not trait contrast:

```
Cultivar ─┐
          ├─ Gene ─ Orthogroup ─ Region / Graph
          └─ (private OG, assembly stats, annotation summary)

Trait Association ── overlay onto Orthogroup, never the root
```

Every URL, every panel title, every copy line must match this hierarchy. If a new surface would put Trait above Gene/OG/Cultivar, it belongs in the trait module, not at the resource level.

## How to use this doc

- Before writing any new UI copy, plan, or README section, read the Declaration + CAN/CANNOT + PAV-vocabulary + tier-gating sections.
- Before adding a feature, check it against the exclusion list. If it would violate, it belongs in a different product.
- Before wiring a new surface, confirm it respects the entity spine (Gene/OG/Cultivar/Region first-class; Trait as overlay).
- Link to this doc from `CLAUDE.md` and `docs/product-specs/idea.md`.

## Changelog

- **2026-04-18** — Initial lock: *Phenotype-driven candidate discovery DB*.
- **2026-04-20** — Reframed to *Comparative pangenome resource with phenotype-association module* after methodology review (anchor-locus AF over-representation). PAV banned-entirely → evidence-graded-allowed. Entity spine (Gene/OG/Cultivar/Region) promoted to first-class.

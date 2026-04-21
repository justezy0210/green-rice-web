# Scope — Korean Japonica Comparative Pangenome Resource (updated 2026-04-21)

> **History.** 2026-04-18 locked the resource as a *phenotype-driven candidate discovery DB*. 2026-04-20 reframed the identity as **a comparative pangenome resource with candidate discovery as one analysis module** — entity units became first-class. 2026-04-21 expands the analysis module into a full **5-step analysis workflow** (`/analysis/:runId/*`) with a first-class `Candidate` object *inside the module*. Entity spine remains primary; the workflow is how the module exposes its output.

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

### At the analysis module (5-step workflow)

Exposed as a dedicated module at `/analysis/:runId/*`. Not a replacement for the entity surfaces — it consumes them.

- **Step 1 Phenotype** — proposed group definition, group balance, QC placeholders (PCA/kinship when available)
- **Step 2 Orthogroups** — OG ranking by copy-count contrast between proposed phenotype groups
- **Step 3 Variants** (available when SV matrix released) — event-normalized SV table with per-group frequency
- **Step 4 Intersections** (available after Step 3) — OG × SV impact classes (gene body / CDS / promoter / upstream / cluster enclosure / CNV / inversion boundary / TE)
- **Step 5 Candidates** — ranked candidate list with evidence on up to 7 axes (Group specificity, Function, OG pattern, SV impact, Synteny, Expression, QTL); each axis labelled `ready` / `pending` / `external-future` / `partial`
- Per-cluster AF at the anchor locus for a given trait — **only when anchor representativeness warrants** (see tier gating)

### `Candidate` — module-scoped first-class object

`Candidate` is first-class **inside the analysis module**, not at the resource level. It is bound to a specific `runId` (frozen snapshot of trait · grouping version · OrthoFinder version · SV release · gene_model version · scoring version). The same OG can surface as different candidates across runs; candidates do not exist outside a run.

URL: `/analysis/:runId/candidate/:candidateId`. Entity URLs stay canonical; the run context is passed as `?run=...` query only.

Candidate types (for ranking/explanation only — not biological categories):
- `og_only` — copy/PAV pattern only
- `og_plus_sv` — OG with nearby or overlapping SV
- `sv_regulatory` — OG present everywhere, SV in promoter/upstream group-specific
- `cnv_dosage` — copy count × group
- `haplotype_block` — inversion / large rearrangement inside an OG cluster

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

## Information architecture — dual axis

The resource has two axes and they must stay separable.

```
Browse axis (canonical, entity-first)
  Cultivar ─┐
            ├─ Gene ─ Orthogroup ─ Region / Graph
            └─ (private OG, assembly stats, annotation summary)

Analysis axis (module, runId-scoped)
  /analysis/:runId ─ step1 phenotype
                   ─ step2 orthogroups
                   ─ step3 variants
                   ─ step4 intersections
                   ─ step5 candidates ─ /candidate/:candidateId
```

**Primacy rule.** Entity pages (`/cultivar/:name`, `/genes/:geneId`, `/og/:ogId`, `/region/...`) are the resource-identity surface. They must be reachable without passing through the analysis module. Dashboard copy, README, and manuscript abstract stay entity-first.

**Module rule.** The analysis module owns `/analysis/*` and all trait-first, candidate-first, ranking-first UI lives there. The module links *into* entity pages (`?run=...` query), and entity pages link *back* via an `Observed In Analyses` panel, but the module's URLs never escape to the resource root.

If a new surface would put Trait Association above Gene/OG/Cultivar *at the resource level*, it belongs in the analysis module, not at the resource level. The module itself can be trait-first internally.

## How to use this doc

- Before writing any new UI copy, plan, or README section, read the Declaration + CAN/CANNOT + PAV-vocabulary + tier-gating sections.
- Before adding a feature, check it against the exclusion list. If it would violate, it belongs in a different product.
- Before wiring a new surface, confirm it respects the entity spine (Gene/OG/Cultivar/Region first-class; Trait as overlay).
- Link to this doc from `CLAUDE.md` and `docs/product-specs/idea.md`.

## Changelog

- **2026-04-18** — Initial lock: *Phenotype-driven candidate discovery DB*.
- **2026-04-20** — Reframed to *Comparative pangenome resource with phenotype-association module* after methodology review (anchor-locus AF over-representation). PAV banned-entirely → evidence-graded-allowed. Entity spine (Gene/OG/Cultivar/Region) promoted to first-class.
- **2026-04-21** — Analysis module expanded from "trait association table" to a **5-step workflow** at `/analysis/:runId/*` with `Candidate` as a first-class object *inside the module*. IA restated as dual-axis (Browse + Analysis). Entity spine remains the resource identity. `runId` 6-tuple snapshot (`trait · groupingV · orthofinderV · svReleaseV · geneModelV · scoringV`) supports version coexistence (11-cultivar MVP ↔ 16-cultivar release, SV-off ↔ SV-on). Exclusion list unchanged.

# Identity Lock — Phenotype-Driven Candidate Discovery DB

Status: active — 2026-04-18
Source: cross-verification (Claude Lead + Codex GPT-5.4) after owner's explicit redirect away from "parent-pair marker workbench" back to the original phenotype-discovery intent.

## Locked declaration

> "This resource is a Korean temperate japonica phenotype-driven candidate discovery database that prioritizes candidate genes and genomic elements distinguishing trait groups across 16 cultivars using orthogroup, variant, and graph-based evidence, as a starting point for downstream biological validation."
>
> "이 리소스는 16개 한국 temperate japonica 품종에서 형질 그룹을 구분하는 후보 유전자 및 유전체 요소를 orthogroup, 변이, 그래프 기반 증거로 우선순위화해 제시하는 표현형 기반 후보 발견 데이터베이스이며, 후속 생물학적 검증의 출발점을 제공한다."

This sentence goes at the top of README, idea.md, introduction.md, the landing page, and the manuscript abstract. Any longer pitch must be consistent with it.

## Primary user

Trait biologist / QTL follow-up researcher / upstream (pre-MAS) breeder. **Not** a molecular breeder developing KASP markers, **not** a GS/GEBV operator, **not** a pangenome-methods researcher.

## Scope — In

- Trait-group definition (manual + GMM auto-proposal)
- OG / variant / SV-PAV ranking per trait with ranking criterion visible
- Multi-modal evidence (copy-count, AF contrast, graph/cluster)
- Candidate detail with gene locations, variants, graph/cluster view
- Limitation copy that consistently flags "not causal / not validated / requires follow-up"
- Download: per-trait candidate table, evidence table, coords/annotation export
- Panel provenance: 16 cultivars listed, Cactus + OrthoFinder + VCF versions, generation methods
- Honest negative cases: traits whose candidates are weak or absent are shown as weak/absent

## Scope — Out (strict exclusion list)

- KASP / CAPS / InDel / primer design / flanking extraction packaging
- "Parent pair polymorphism" as a task
- Marker recommendation, breeder-ready / deployment-ready artifacts
- MAS / GS / GEBV language
- Validated PAV / validated LoF / pseudogene confirmed calls
- Causal / driver / determinant language for candidates
- "Best marker", "top marker"
- "한국 벼 전체 대표" style generalization
- Wet-lab QC claims (false-priming, assay suitability)
- Downstream assay conversion pipeline

Parent-pair marker workbench remains a possible separate future product. It is not a module of this DB. Do not design the DB so it can "extend" into it.

## Red flags to lint against (severity-ordered)

1. Candidates framed as causes
2. 16-cultivar findings framed as general rules
3. GMM groups framed as biological truth instead of "proposed grouping"
4. Suppressing uncertainty in OG / PAV / SV calls
5. Letting pretty graphics inflate apparent evidence strength
6. Ranking scores read as confirmation
7. Breeder-facing copy combined with missing marker-ready features
8. "Korean-specialized" claim not matched by Korean-research-question grounding
9. Annotation / coords / provenance / versioning unclear
10. Hiding negative cases

## Approach

### P0 — Declaration everywhere (~1h)

- Update `README.md` (top block + "What this is" section)
- Update `docs/product-specs/idea.md` (identity + user)
- Update `docs/product-specs/introduction.md` (manuscript intro)
- Update landing or Explore header
- Add a single-source `docs/product-specs/scope.md` holding the declaration + in/out lists so other docs can link to it

### P1 — Red-line language audit (~1h)

Grep the code + docs for the exclusion list. Rewrite hits.

Forbidden tokens (case-insensitive unless noted):
- `KASP`, `CAPS`, `primer`, `flanking`
- `marker-ready`, `marker-prep`, `breeder-ready`, `deployment-ready`, `MAS`, `GEBV`, `GS `
- `parent pair`, `parent-pair`, `two parent`
- `validated PAV`, `validated LoF`, `pseudogene`
- `causal`, `driver`, `determinant` (context-sensitive; keep in historical docs/refs where appropriate)
- `best marker`, `top marker`
- `proven`, `confirmed` when applied to candidate findings

Allow the token where it is part of a faithful caveat (e.g. "annotation absence is not the same as a validated PAV").

### P2 — UI scope panels (~1.5h)

In `OgDetailPage` and `ExplorePage` add a collapsible "Scope" panel:

```
What this page CAN tell you
 - Trait groups that differ by copy count / AF / graph context at this locus
 - Annotated OG member positions across the 16 cultivars
 - Where a cluster lifts to on IRGSP and what variants sit there

What this page CANNOT tell you
 - Whether this candidate is causal for the trait
 - Whether a cultivar with "no annotated member" truly lacks the gene
 - Whether the reported variants would work as KASP/CAPS markers
 - Whether this finding generalizes beyond the 16-cultivar panel
```

Then a "Next recommended checks" section with external-tool guidance:

```
To validate what you see here
 - Reference CDS → assembly reverse search (BLAST / minimap2)
 - ORF integrity inspection at the candidate locus per cultivar
 - Promoter / 5' UTR variant scan upstream of the annotated gene
 - Expression validation (RNA-seq / qPCR) if available
 - Wider-panel genotyping before treating this as a population claim
```

### P3 — GMM grouping honesty (~30min)

Any UI or file that shows GMM-derived groups must label them as **proposed**. Copy audit:
- Dashboard chart legends
- Grouping picker UI
- Diff doc exports (include `source: 'gmm-proposed'` in JSON if not already)

### P4 — Panel provenance surfacing (~30min)

One page / section (e.g. `Panel` route or About modal) listing:
- 16 cultivar IDs + which 11 are in the pangenome
- Cactus version, OrthoFinder version, IRGSP-1.0 version
- VCF / liftover methods
- Link to `data/cultivars.json` as the single source

### P5 — Document housekeeping (~30min)

Move these to `docs/exec-plans/completed/` with a short note that they predate the identity lock and carry outdated framing:
- Any active plan still referencing parent-pair, KASP, marker design, etc.

Active plans that should be kept and annotated as consistent with the new identity:
- `2026-04-18-cnv-af-evidence-layers.md` (fits new identity — just cross-reference the lock)

## Non-goals

- No new data pipelines
- No re-running the pangenome
- No new analyses
- No changes to existing ranking logic — only its labelling

## Risks

1. **Regression of vague language over time.** Mitigation: keep `docs/product-specs/scope.md` as a single reference point and link from CLAUDE.md so future edits check against it.
2. **Users reading the scope panel as marketing rather than constraint.** Mitigation: put the CANNOT list first above the CAN list in the final copy.
3. **Parent-pair ideas creeping back in as "small additions".** Mitigation: every new plan must declare how it respects the exclusion list.

## Verification

- [ ] `npm run build` passes
- [ ] `npm run check:arch` passes
- [ ] Red-line grep returns zero user-facing hits (non-caveat context)
- [ ] Declaration sentence present in all four target docs (README, idea, introduction, scope)
- [ ] Scope panel visible on OG Detail and Explore
- [ ] GMM groups labelled "proposed" wherever surfaced
- [ ] Panel provenance reachable from the main UI
- [ ] `/verify general-review` on final copy (foreground per updated verify skill)

## Result (when moving to completed/)

- Status: SUPERSEDED
- Notes: The original phenotype-driven identity lock was replaced by the
  2026-04-20 entity-centered scope in `docs/product-specs/scope.md`,
  `CLAUDE.md`, and `AGENTS.md`. Its useful constraints live on as the current
  exclusion list, PAV vocabulary, and tier-gating policy.

# [PLAN] Site Rebuild — 5-Step Analysis Workflow as Analytical Backbone

Status: DRAFT · 2026-04-21
Verification reference: /tmp/codex-rebuild-arch-out.txt (verify general-review, 2026-04-21)

## Goal

Green Rice Web을 **dual-axis 사이트**로 재구성한다.

- **Browse axis** — Cultivar / Gene / Orthogroup / Region entity pages (canonical reference).
- **Analysis axis** — `/analysis/:runId/*` 아래 5-step workflow (phenotype → orthogroups → variants → intersections → candidates).

Candidate는 analysis-scoped first-class object가 되고, `runId` 6-tuple 스냅샷이 trait / grouping / OrthoFinder / SV release / gene_model / scoring version을 모두 동결한다. 현 MVP 11 품종과 완본 16 품종이 같은 URL/스키마 위에서 공존한다.

이번 재구성은 "마지막 리빌드"를 가정한다. 이후 확장(SV matrix, intersections, bulk RNA-seq, QTL overlap)은 전부 같은 구조 안에서 새 `runId` 또는 새 release 축으로 붙는다.

## Context

### 사용자 결정

- Dashboard `/` 와 Cultivar 엔티티는 그대로 유지 ("맘에 든다").
- 5-step 분석 흐름(`analysis-idea.md`)을 제품의 분석 backbone으로 채택.
- scope.md 정체성 잠금(2026-04-20, entity-first)은 유지하되, **trait-first analysis surface는 모듈로 허용**한다. 단 validated PAV / causal / marker / MAS / GS / GEBV / "Korea rice representative" 금지는 유효.
- 현 `/explore` 는 2단계 결과(OG Diff Table)만 보여주는 얇은 페이지라 5-step backbone을 담지 못함 → 폐기 + `/analysis` 로 교체.

### 데이터 상태 (2026-04-21)

| 축 | 상태 |
|---|---|
| OG copy matrix (16 품종), OG × trait MWU, functional index, gene_models (11), IRGSP 통합, GMM grouping, anchor-locus 변이 (cluster-local) | **ready** |
| Genome-wide event-normalized SV matrix | **pending** (`green-rice-pg.vcf.gz` 11 샘플 존재, 정규화 스크립트 없음) |
| OG × SV intersect | **pending** (SV matrix 후속) |
| Genome-wide OG synteny block | **partial** (cluster-local halLiftover만) |
| Bulk RNA-seq expression (binary) | **pending** (데이터 도착 대기) |
| External QTL / GWAS overlap | **external** (DB 연동 미정) |
| Permutation / FDR calibration, PCA/kinship QC | **missing** |
| 나머지 5 품종 gene_models | **ongoing** (funannotate 진행 중) |

### 현행 구조 문제 (합의 진단)

1. `/explore`가 trait association 한 표 이상이 아니라 step 1 grouping QC, step 3 SV, step 4 intersect, step 5 candidate가 전부 없다.
2. 분석 결과의 중심 객체가 없어 OG를 눌러 OG detail로 들어가는 우회 흐름이 된다.
3. 데이터 릴리스가 producer-centric (`orthogroup_diffs`, `og_region_af` 등)이라 "한 trait × 한 grouping 조합의 후보"라는 사용자 질문 단위로 묶이지 않는다.

## Approach

### 1. Top-level site structure (dual-axis)

최종 route map:

```
/                             Dashboard
/analysis                     Analysis home (recent runs + start new)
/analysis/:runId              Run overview (step progress + candidate summary)
/analysis/:runId/phenotype    Step 1
/analysis/:runId/orthogroups  Step 2
/analysis/:runId/variants     Step 3 (disabled until SV matrix)
/analysis/:runId/intersections Step 4 (disabled until intersections)
/analysis/:runId/candidates   Step 5
/analysis/:runId/candidate/:candidateId

/cultivars
/cultivar/:name
/genes
/genes/:geneId
/og/:ogId
/region/:cultivar/:chr/:range
/download
/admin /login
```

- `/explore` 는 301 리다이렉트로 `/analysis` 에 흡수.
- Step URL은 시맨틱 이름 (phenotype/orthogroups/variants/intersections/candidates). 순번은 stepper UI에서만 표시.
- Step 3·4는 데이터 미완이더라도 **disabled state로 UI 노출** (hide 아님) — readiness를 명시하는 것이 5-step 백본 서술에 필수.

### 2. runId — 6-tuple versioned snapshot

```
{traitId}_g{groupingV}_of{ofV}_sv{svV}_gm{geneModelV}_sc{scoringV}
```

예: `heading_date_g4_ofv6_svv0_gm11_scv0` (현 MVP, SV 미완)
→ SV 도착 후 `heading_date_g4_ofv6_svv1_gm11_scv1`
→ 16 품종 완본 후 `heading_date_g4_ofv6_svv1_gm16_scv1`

- runId는 불변. 새 버전은 새 runId.
- URL, Firestore doc ID, Storage path 모두 runId 기준.
- 이 덕분에 11↔16 전환·grouping 재실행·scoring 변경 시 기존 URL/북마크 안 깨짐.

### 3. Candidate = analysis-scoped first-class object

- 위치: `/analysis/:runId/candidate/:candidateId`
- 글로벌 `/candidate/:id` 아님. 같은 OG도 run별 candidate 의미가 다르므로.
- Candidate type 5종 (ranking/explanation용 분류):
  - `og_only` — copy/PAV 패턴만 기반
  - `og_plus_sv` — OG + 근접 SV (gene body / upstream)
  - `sv_regulatory` — 모든 품종에 OG 있지만 promoter SV가 group-specific
  - `cnv_dosage` — copy number × group
  - `haplotype_block` — inversion/large rearrangement within OG cluster

Candidate detail 페이지 구성:
- Header: trait · grouping · runId · confidence band
- 7-axis score board (Group specificity / Function / OG pattern / SV impact / Synteny / Expression / QTL)
- Primary linked entities: OG / lead gene / region / lead SV (clickable to canonical entity pages with `?run=...`)
- Scope strip: "not causal / not validated / not marker-ready"
- Export: JSON / CSV

### 4. Entity pages (keep + backlink slot)

Cultivar / Gene / OG / Region는 canonical reference로 유지. 추가 블록 한 개:

- `Observed In Analyses` — `entity_analysis_index/{entityType}_{entityId}` 를 역조회해 이 entity가 등장한 최근 runs 및 top candidates 표시.
- URL은 canonical 유지, 분석 문맥은 query: `/og/OG000123?run=heading_date_g4_ofv6_...&candidate=cand_0042`.
- 엔티티 페이지 내부 콘텐츠: 사실과 구조. Candidate 페이지 내부 콘텐츠: 해석과 우선순위. 원칙적으로 분리.

### 5. Data layer — 3-tier split

**Tier A. Global reusable precompute (run과 무관)**

```
sv_releases/{svReleaseId}
  normalizationMethod, sourceVcf, sampleSet, eventCount,
  chunkManifestPath, status

intersection_releases/{intersectionReleaseId}
  svReleaseId, geneModelVersion, promoterWindowBp,
  enclosurePolicy, outputManifestPath, status
```

Storage:
```
sv_matrix/{svReleaseId}/manifest.json
sv_matrix/{svReleaseId}/by_chr/chr01.json.gz
sv_matrix/{svReleaseId}/by_event/EV000001.json.gz
og_sv_intersections/{intersectionReleaseId}/manifest.json
og_sv_intersections/{intersectionReleaseId}/by_og/OG000123.json.gz
og_sv_intersections/{intersectionReleaseId}/by_event/EV000001.json.gz
```

**Tier B. Run-scoped bundles**

```
analysis_runs/{runId}
  traitId, groupingVersion, orthofinderVersion,
  svReleaseId, intersectionReleaseId, geneModelVersion,
  sampleSetVersion, sampleCount, status, stepAvailability,
  candidateCount, createdAt, updatedAt

analysis_runs/{runId}/candidates/{candidateId}
  candidateType, primaryOgId, leadGeneId, leadRegion, leadSvId,
  rank, totalScore, scoreBreakdown (7-axis),
  groupSpecificitySummary, functionSummary, orthogroupPatternSummary,
  svImpactSummary, syntenySummary, expressionSummary, qtlSummary,
  badges, storageBundlePath

analysis_runs/{runId}/step_status/{step}
  status: ready|pending|disabled|error
  (phenotype, orthogroups, variants, intersections, candidates)
```

Storage:
```
analysis_runs/{runId}/step1_grouping.json.gz
analysis_runs/{runId}/step2_orthogroup_rankings.json.gz
analysis_runs/{runId}/step3_sv_rankings.json.gz
analysis_runs/{runId}/step4_intersections.json.gz
analysis_runs/{runId}/step5_candidates_summary.json.gz
analysis_runs/{runId}/candidates/{candidateId}.json.gz
analysis_runs/{runId}/exports/candidates.csv
analysis_runs/{runId}/exports/candidates.json
```

**Tier C. Reverse index (entity backlink)**

```
entity_analysis_index/{entityType}_{entityId}
  entityType: gene|og|region|sv
  entityId
  linkedRuns: [runId, ...]
  topCandidates: [{runId, candidateId, rank, traitId, ...}]
  latestUpdatedAt
```

### 6. Dashboard 재구성

4 블록, entity-first copy 유지:

1. **Browse the panel** — Cultivars · Genes · Orthogroups · Regions 엔트리 카드
2. **Start an analysis** — trait selector + 최근 runs 3–5개 + "5-step candidate workflow" 설명 카드
3. **Current data readiness** — OG ready · SV pending · intersect pending · expression pending · QTL external
4. **Panel snapshot** — cultivar / gene_model / orthogroup / variant / latest release counts

Dashboard는 "어디를 탐색하는 곳인가 + 지금 무엇을 분석할 수 있는가"를 동시에 제시하되, 메인 카피는 entity-first로 유지. Analysis는 capability이지 identity가 아니다.

### 7. Step별 화면 정의

**Step 1 `/analysis/:runId/phenotype`**
- trait 분포
- GMM grouping 결과 + sample list A/B
- group balance (landrace/improved · region · year)
- PCA/kinship QC (Phase 5까지 placeholder, 이후 live)
- "analysis scope · small sample · candidate discovery only" strip

**Step 2 `/analysis/:runId/orthogroups`**
- OG ranking table (copy / PAV / group freq / MWU p)
- trait-hit filters, function facets (Pfam/InterPro/GO)
- "Add to candidate set" action
- 현 `/explore` 의 OG Diff Table 기능 이식 + 개선

**Step 3 `/analysis/:runId/variants`** (Phase 3 활성)
- event-normalized SV table
- group A/B frequency, type filter (INS/DEL/CNV/INV-like)
- nearby genes / overlapped genes
- region jump (`/region/...?run=...`)

**Step 4 `/analysis/:runId/intersections`** (Phase 4 활성)
- OG × SV evidence table
- impact class filter: gene_body · cds_disruption · promoter · upstream · cluster_enclosure · cnv_support · inversion_boundary · te_associated
- evidence aggregation card per OG

**Step 5 `/analysis/:runId/candidates`**
- ranked candidate list (candidate-type badge, 7-axis score bar)
- export
- candidate detail drilldown (별도 route)

## Phased implementation

### Phase 1 — IA 전환 (데이터 재돌림 없음)

**목표**: URL · 스키마 · Dashboard · 엔티티 백링크 슬롯까지만 이관. 실제 워크플로우 데이터는 placeholder.

- `/analysis` shell + runId 체계 도입
- `/explore` → `/analysis` 301
- Dashboard 4블록 재편
- `analysis_runs` · `candidates` · `entity_analysis_index` Firestore 스키마 정의 + 빈 문서 생성
- Entity pages에 `Observed In Analyses` 슬롯 (빈 상태)
- runId 인코딩/디코딩 유틸 (`src/lib/analysis-run-id.ts`)

> 배포 가능. 사용자에게 보이는 기능 변화는 nav 재편 + readiness 표시까지.

### Phase 2 — Step 1+2+5 MVP 실작동 (SV 없이)

**목표**: 현 데이터로 5-step workflow의 "half-spine"을 live.

- Step 1 phenotype: GMM 결과 + group balance + QC placeholder
- Step 2 orthogroups: 현 OG Diff Table 이식 + add-to-candidate
- Step 5 candidates: `og_only` type만 활성, 3-axis scoring (Group specificity · Function · OG pattern)
- Candidate detail page
- 첫 runId release: `{trait}_g4_ofv6_svv0_gm11_scv0` 9개 trait 모두
- `analysis_runs/{runId}/candidates/` 생성 스크립트 (`scripts/build-analysis-run.py`)

> 첫 실사용 가능 재출시 시점.

### Phase 3 — SV layer

**목표**: step 3 live, candidate type 확장.

- `scripts/build-sv-matrix.py` — VCF 정규화 (`vcfwave` → `bcftools norm -m-` → `LV=0` 필터) + event 태깅 + type 추론 → `sv_releases/sv_v1`
- Step 3 variants 구현 (SV browser, group freq diff 필터)
- candidate scoring v2 — SV impact 축 활성, `og_plus_sv` / `sv_regulatory` type 분류
- runId `svv0 → svv1`, `scv0 → scv1` 로 새 run 릴리스

### Phase 4 — Intersections

**목표**: 5-step 전체 활성화.

- `scripts/build-og-sv-intersect.py` — sv_events × gene_models overlap + impact class → `intersection_releases/int_v1`
- Step 4 intersections 구현
- candidate type `cnv_dosage` · `haplotype_block` 활성
- promoter window (예: 2kb) 정책 문서화 · UI 표시
- Inversion 검출은 vg deconstruct 한계로 Phase 4에서 별도 caller 필요성 재평가

### Phase 5 — Future evidence

- Bulk RNA-seq binary expression (도착 시) → Expression axis live
- 외부 QTL/GWAS DB 연동 → QTL axis live
- Permutation / FDR calibration → confidence band 교체
- Genome-wide synteny block → Synteny axis 강화
- 16 품종 완본 gene_models 도착 → `gm11 → gm16` 새 run 릴리스

## Files to modify / create

### New
- `src/pages/AnalysisHomePage.tsx`
- `src/pages/AnalysisRunPage.tsx` (run overview)
- `src/pages/AnalysisStepPhenotypePage.tsx`
- `src/pages/AnalysisStepOrthogroupsPage.tsx`
- `src/pages/AnalysisStepVariantsPage.tsx` (Phase 3)
- `src/pages/AnalysisStepIntersectionsPage.tsx` (Phase 4)
- `src/pages/AnalysisStepCandidatesPage.tsx`
- `src/pages/CandidateDetailPage.tsx`
- `src/components/analysis/AnalysisShell.tsx` (stepper + context bar)
- `src/components/analysis/StepStatusBadge.tsx`
- `src/components/analysis/CandidateTypeBadge.tsx`
- `src/components/analysis/CandidateScoreBoard.tsx`
- `src/components/dashboard/StartAnalysisCard.tsx`
- `src/components/dashboard/DataReadinessCard.tsx`
- `src/components/entity/ObservedInAnalysesPanel.tsx`
- `src/lib/analysis-run-id.ts` — 6-tuple encode/decode
- `src/lib/candidate-service.ts`
- `src/lib/analysis-run-service.ts`
- `src/lib/entity-analysis-index-service.ts`
- `src/hooks/useAnalysisRun.ts`
- `src/hooks/useCandidate.ts`
- `src/hooks/useObservedInAnalyses.ts`
- `src/types/analysis-run.ts`
- `src/types/candidate.ts`
- `scripts/build-analysis-run.py`
- `scripts/build-sv-matrix.py` (Phase 3)
- `scripts/build-og-sv-intersect.py` (Phase 4)
- `scripts/build-entity-analysis-index.py`

### Modify
- `src/App.tsx` — route 교체 (`/explore` 제거, `/analysis/*` 7개 추가)
- `src/pages/DashboardPage.tsx` — 4-block 재편
- `src/pages/ExplorePage.tsx` — deprecated, 301 redirect
- `src/pages/CultivarDetailPage.tsx` — ObservedInAnalysesPanel 슬롯
- `src/pages/GeneDetailPage.tsx` — ObservedInAnalysesPanel 슬롯
- `src/pages/OgDetailPage.tsx` — ObservedInAnalysesPanel 슬롯
- `src/pages/RegionPage.tsx` — ObservedInAnalysesPanel 슬롯
- `docs/product-specs/scope.md` — trait-first analysis surface 허용 명문화
- `docs/product-specs/features.md` — 새 구조 반영
- `docs/product-specs/analysis-idea.md` — runId 체계 연결
- `storage.rules` — `analysis_runs/` · `sv_matrix/` · `og_sv_intersections/` 경로
- `firestore.rules` — 새 컬렉션 접근 규칙

### Delete (나중에)
- `src/pages/ExplorePage.tsx` 내부 body (301 후 유지 기간 경과 시)
- 사용 중단되는 Trait Association 전용 컴포넌트 (Phase 2 완료 후 회수)

## Risks / Open questions

1. **runId 6-tuple 안정성** — scoringVersion을 어떻게 bump할지 규칙이 필요. minor scoring tweak마다 새 run을 만들면 URL bloat, 재사용하면 혼선. 정책 결정 필요.
2. **Firestore 1 MB 제한** — 후보 상세 evidence는 반드시 Storage 번들로. `analysis_runs/{runId}/candidates/{candidateId}` doc은 header만, 세부는 Storage.
3. **client fetch / chunking 전략** — Step 3·4 매트릭스가 Region 페이지에 붙을 때 chunked fetch + facet cache 설계 필요. 잘못 만들면 `/analysis`가 무거운 SPA가 됨.
4. **Step 1 QC 신뢰도** — 11/16 샘플, temperate japonica 단일 subspecies라도 landrace/improved 교란이 있음. 이걸 "nudge"에서 "hard warning"으로 격상할지, 단순 표시에 그칠지 UX 결정 필요.
5. **Entity page와 candidate page 중복** — Gene detail과 Candidate detail이 같은 gene을 다르게 서술. 원칙 필요: entity = 사실·구조, candidate = 해석·우선순위.
6. **Inversion 검출** — vg deconstruct VCF로는 Case 4 재현 불가. Phase 4에서 minigraph `--call` 또는 hal2vcf 재돌림 필요한지 결정.
7. **기존 bookmark / 외부 링크** — `/explore?trait=...` 를 쓰고 있는 외부 참조가 있다면 301로 대응 가능하나, `/explore/og/:id` 는 `/og/:id` alias로 남아 있음. 정리 필요.
8. **Scope.md 개정 범위** — trait-first analysis surface 허용을 명문화할 때 어디까지 풀지. candidate = "observed along with" 문구는 유지하되, "Trait Analysis Workflow" 전체 surface 허용만 추가하고 나머지 금지는 그대로.

## Verification

- [ ] `npm run check:all` 통과 (lint + tsc + arch)
- [ ] runId encode/decode 유틸 유닛 테스트
- [ ] Phase 1 배포 후 `/explore` → `/analysis` 리다이렉트 동작 확인
- [ ] Phase 2 배포 후 Step 1/2/5 end-to-end 스모크 (9 trait × runId 1개)
- [ ] scope.md 개정안이 기존 금지 목록과 충돌 없는지 사용자 리뷰
- [ ] /verify 외부 검증 통과 (이미 1차 완료, 중요 수정 시 재수행)

## Result (completed 이동 시 작성)

- Status: —
- Notes: —

# [PLAN] Candidate Block Rollout — Phase A (promote + UI slice)

Status: DRAFT · 2026-04-22
Design doc: [`docs/design-docs/analysis-block-ui.md`](../../design-docs/analysis-block-ui.md)
Verify reference: `/tmp/codex-narrative-ui-out.txt` (general-review, 2026-04-22)

## Goal

`docs/design-docs/analysis-block-ui.md` 가 정의한 **analysis-scoped `CandidateBlock` first-class object** 를 Firebase에 materialize하고, 사용자가 다음 두 문장을 데이터·UI를 보고 자연스럽게 말할 수 있는 진입 경로를 만든다.

> "표현형 A 그룹에서 enrichment된 chr11 구조변이가 저항성 관련 orthogroup을 포함하고 있으며, 반대 그룹에서는 같은 패턴이 관찰되지 않았다. 따라서 이 locus는 표현형 A와 관련된 candidate block으로 우선 검토할 가치가 있다."

> "이 block 안의 candidate gene들은 WAK-like / NLR-like annotation을 가지며, OG 존재/부재 또는 copy pattern과 local SV pattern이 함께 그룹 차이를 보인다."

즉 OG 단일 관점이 아니라 **"SV + OG + annotation + phenotype contrast" 네 증거를 같은 좌표 구간에서 한 번에 보여주는 surface** 가 필요하다.

## Context

### 기존 입력 (Phase 3A까지 완료)

- `sv_matrix/sv_v1/` — 18,822 event-normalised SV (LV=0 ≥50bp) + per-cultivar GT + per-trait per-group AF
- `orthogroup_diffs/{trait}` — per-trait MWU OG 랭킹
- `analysis_runs/{runId}/candidates/{ogId}` — 현재 `og_only` candidate (3-axis scoring) 만
- `entity_analysis_index/og_*`, `gene_*` — ObservedInAnalyses backlink
- `trait_hits/v6_g4/index.json` — OG 별 trait p-value 색인
- `gene_models/` — 11 cultivar gene 좌표

### 서버 raw run 산출물 (`2026-04-22`, repo에 스크립트 복사됨)

- `step1_groupings.json`
- `step2_orthogroups/{trait}.tsv|json`
- `step3_sv_top/{trait}.tsv` — trait별 top-100 SV by group AF gap
- `step4_intersections/{trait}.tsv` — OG × SV overlap with `impactClass`
- `step5_candidates/{trait}.json|tsv` — candidate rows with `candidateType` (`og_only` / `og_plus_sv` / `sv_regulatory` / `cnv_dosage` / `haplotype_block`), `bestSvId`, `bestImpactClass`, `bestCultivar`, `bestGeneId`, `baseRank`, `baseScore`, `combinedScore`
- `followup_block_summary.tsv` · `followup_shared_ogs.tsv` · `followup_block_report.md` — 1Mb bin aggregation
- `curated_blocks/{blockId}/{candidates,intersections}.tsv` + `summary.md` — 3 manually curated regions
- 복사된 repo scripts: `scripts/run-raw-analysis.py`, `scripts/summarize-analysis-blocks.py`, `scripts/extract-curated-blocks.py`

### Cross-verification 보강 (Codex 2026-04-22)

Design doc 위에 추가로 반영할 원칙:

1. **`shared_haplotype_block` 타입 명칭 변경** — "haplotype block" 은 scope.md 상 overclaim 위험. `shared_linked_block` 또는 `shared_region_block` 로. block type은 UI badge 목적이므로 이름만 바꿔도 충분.
2. **Curated vs auto block은 같은 컬렉션, `curated: boolean` 필드로 구분.** 별도 컬렉션 금지. curated는 `summaryMarkdown` + `Curated review region` 배지, auto는 `Auto-aggregated 1 Mb window` 배지.
3. **고정 strip**: block detail과 block list 모두에 다음 한 줄 고정 노출 — `"Candidate block is a review unit; window boundaries do not imply an inferred haplotype."`
4. **`Jump to block`** 을 universal nav primitive로 만든다 — candidate row / OG row / SV row / gene row / region page 전부. 단일 함수로 blockId 결정 (lookup by trait + coordinate overlap).
5. **`ConvergentEvidenceCard` 를 block detail의 hero 카드로 고정** — 5 슬롯 (SV block · OG block · Intersection block · Function block · footer actions). 다른 페이지는 요약 + "Jump to block" 만 두고 완결은 block detail에서만.
6. **Region page** 의 ObservedInAnalyses `region_*` exact-string index는 약점. `Overlapping analysis blocks` 카드 (coordinate overlap lookup) 로 교체.
7. **Repeated family cluster chip** — 같은 family annotation (NLR/WAK 등) 이 한 block에 다수일 때 `repeated family cluster` 배지 + "linked block first" 경고.
8. **Provenance bar** — block detail 상단에 `runId`, `blockSetVersion`, `svReleaseId`, `geneModelVersion` 노출.
9. **Dashboard "Current review blocks" 카드** — curated 3개 직접 deep link.

## Approach

### 1. Promote 스크립트 (단일)

`scripts/promote-analysis-run.py` 신규 — 서버 `full_run/` 디렉토리 입력, Firestore + Storage 업로드.

인수:
```
--run-dir <path to full_run/>
--sv-release-id sv_v1
--sv-version 1
--scoring-version 1
--gene-model-version 11
--grouping-version 4
--orthofinder-version 6
[--curated-dir <path to curated_blocks/>]
[--dry-run]
```

**업로드 내역:**

1. **Candidate 확장** — 각 trait의 `step5_candidates/{trait}.json` 읽어 `analysis_runs/{runId}/candidates/{ogId}` 업데이트 (새 runId = `{trait}_g4_of6_sv1_gm11_sc1`)
   - 신규 필드: `candidateType`, `bestSv {eventId, svType, chr, start, end, impactClass, cultivar, geneId, absDeltaAf}`, `baseRank`, `baseScore`, `combinedScore`, `blockId`
2. **Intersections** — `step4_intersections/{trait}.tsv` → Storage `analysis_runs/{runId}/step4_intersections.json.gz` + OG 역조회용 `og_sv_intersections/int_v1/by_og/{ogId}.json.gz`
3. **Blocks** — `followup_block_summary.tsv` + `curated_blocks/*` → Firestore `analysis_runs/{runId}/blocks/{blockId}` + Storage `analysis_runs/{runId}/blocks/{blockId}.json.gz`
   - `blockId` 규칙: auto는 `bin_{chr}_{start}_{end}`, curated는 `curated_{name}` (이미 서버 디렉토리명 그대로)
   - `curated: boolean` 플래그 + curated일 때 `summaryMarkdown` 포함
4. **Run 헤더 확장** — `analysis_runs/{runId}` 에 `topBlockIds`, `blockCount`, `intersectionReleaseId = 'int_v1'`, `svReleaseId = 'sv_v1'` 추가, `stepAvailability.intersections = 'ready'`
5. **Entity index 확장** — `entity_analysis_index/og_{ogId}` 에 `topBlocks: [{ runId, blockId, traitId, chr, start, end }]` 배열 추가

### 2. 타입 + 서비스

**신규 (Types / Lib / Hooks):**
- `src/types/candidate-block.ts` — `CandidateBlock`, `BlockType`, `EvidenceStatus`, `BlockEvidence` 인터페이스
- `src/types/intersection.ts` — `Intersection`, `ImpactClass`
- `src/lib/block-service.ts` — `fetchBlock`, `listBlocks`, `fetchIntersectionsForOg`
- `src/hooks/useBlock.ts`, `useBlocks.ts`, `useIntersectionsByOg.ts`
- `src/lib/block-lookup.ts` — trait + coordinate → blockId helper (overlap resolver)

**확장 (기존):**
- `src/types/candidate.ts` — `bestSv`, `baseRank`, `baseScore`, `combinedScore`, `blockId` 필드 추가
- `src/types/candidate.ts` EntityAnalysisIndex — `topBlocks` 필드 추가
- `src/hooks/useCandidates.ts` — 타입 업데이트만

### 3. 새 페이지 + 컴포넌트

**신규 페이지:**
- `src/pages/AnalysisBlockListPage.tsx` — `/analysis/:runId/blocks`
- `src/pages/AnalysisBlockDetailPage.tsx` — `/analysis/:runId/block/:blockId`

**신규 컴포넌트:**
- `src/components/analysis/ConvergentEvidenceCard.tsx` — 5-slot 고정
- `src/components/analysis/BlockTypeBadge.tsx`
- `src/components/analysis/BlockCaveatStrip.tsx` — "review unit; not a haplotype boundary" 고정 문구
- `src/components/analysis/JumpToBlockChip.tsx` — universal primitive
- `src/components/analysis/TraitRibbon.tsx` — 9 trait p-value heatmap strip
- `src/components/analysis/EvidenceStatusGrid.tsx` — block 안 OG들의 axis 상태 badge
- `src/components/analysis/PhenotypeContrastPanel.tsx`
- `src/components/analysis/StructuralEvidencePanel.tsx`
- `src/components/analysis/OrthogroupEvidencePanel.tsx`
- `src/components/analysis/BlockNarrative.tsx` — template 기반 auto text
- `src/components/entity/OverlappingBlocksPanel.tsx` — region page용

### 4. 기존 페이지 수정

| 페이지 | 변경 |
|---|---|
| `AnalysisHomePage` | `Current review blocks` 카드 (curated 3개 우선) 추가 |
| `AnalysisRunPage` | `Priority blocks` 카드 추가 (topBlockIds 기반 3–5개 preview) |
| `AnalysisStepIntersectionsPage` | stub 제거, block-grouped table 최소 구현. row click 기본 → block detail |
| `AnalysisStepCandidatesPage` | `Block` 컬럼 + `candidateType` 배지 + `bestSv` 축약 표시 + `Jump to block` |
| `CandidateDetailPage` | hero에 `Convergent Evidence summary` + `Open block` 링크. OG 단독 중심 해소 |
| `AnalysisStepVariantsPage` | row에 `Jump to block` chip 추가 (Region link는 보조) |
| `OgDetailPage` | **전면 개편** — 아래 §5 |
| `RegionPage` | `ObservedInAnalysesPanel(region)` 축소, `OverlappingBlocksPanel` 추가 |
| `DashboardPage` | `Current review blocks` 3개 카드 (Codex 제안) |

### 5. OG Detail 전면 개편

Layout (위에서 아래):

```
[Breadcrumb — trait-aware]
[HERO] OG id · core/shell · primary description · transcripts count
       Copy architecture label · trait hits chips (all 9 traits p-value)
[ACTIVE RUN CARD] (when ?trait=...) — candidateType · rank · combined · block chip
[LEAD SV EVIDENCE] (from bestSv) — event · class · cultivar · gene · AF gap · [→ region] [→ SV]
[CULTIVAR COPY MAP] — 11 rows sorted by group: cultivar · group · copy · geneIDs · PAV state
[OG × SV INTERSECTIONS] — filter by impactClass/trait; expand per row
[ANCHOR-LOCUS VARIANTS] — collapsed by default (기존 ClusterContextCard + AF tab)
[CANDIDATE BLOCKS IN ANALYSES] — trait별 이 OG가 속한 blocks
[OBSERVED IN ANALYSES] — ObservedInAnalyses (기존 역할 유지)
```

핵심 변화: 네 가지 증거 수렴은 block detail에서 완결, OG detail은 **이 OG의 multi-trait 컨텍스트 + multi-block 연결 허브** 역할.

### 6. 자동 narrative 문구 표준

허용 template (design-doc §Allowed Templates 그대로) + Codex 추가 예시 채택:

- auto block: `"제안된 {groupA} 그룹에서 이 window의 일부 SV events는 반대 그룹보다 더 높은 allele frequency 차이를 보이며, 같은 window 안에 copy-count contrast를 보이는 orthogroups와 OG×SV overlap rows가 함께 관찰된다."`
- curated block: `"이 curated review region은 인접한 candidate rows를 하나의 구조적 이웃 맥락에서 다시 묶어 보여준다. {impactClasses} overlap과 {functionTerms} annotation이 함께 관찰되며, 독립 locus 여러 개보다 하나의 review unit으로 읽는 편이 적절하다."`
- OG→block backlink: `"이 orthogroup은 {trait} run의 {chr}:{start}-{end} block에서 상위 candidate rows와 함께 관찰되었다."`
- SV→block backlink: `"이 SV event는 {trait} run에서 group frequency gap이 큰 event 중 하나이며, 같은 block window에서 OG overlap 및 기능 annotation 신호와 함께 표시된다."`

금지어: validated, causal, driver, determinant, marker-ready, explains, confers (design-doc §Forbidden 원칙 유지).

## Files to modify / create

### New (Python / data)
- `scripts/promote-analysis-run.py` — 통합 promote
- (선택) `scripts/refresh-block-narratives.py` — template 재생성

### New (TS)
- `src/types/candidate-block.ts`
- `src/types/intersection.ts`
- `src/lib/block-service.ts`
- `src/lib/block-lookup.ts`
- `src/hooks/useBlock.ts`, `useBlocks.ts`, `useIntersectionsByOg.ts`
- `src/pages/AnalysisBlockListPage.tsx`
- `src/pages/AnalysisBlockDetailPage.tsx`
- `src/components/analysis/ConvergentEvidenceCard.tsx`
- `src/components/analysis/BlockTypeBadge.tsx`
- `src/components/analysis/BlockCaveatStrip.tsx`
- `src/components/analysis/JumpToBlockChip.tsx`
- `src/components/analysis/TraitRibbon.tsx`
- `src/components/analysis/EvidenceStatusGrid.tsx`
- `src/components/analysis/PhenotypeContrastPanel.tsx`
- `src/components/analysis/StructuralEvidencePanel.tsx`
- `src/components/analysis/OrthogroupEvidencePanel.tsx`
- `src/components/analysis/BlockNarrative.tsx`
- `src/components/entity/OverlappingBlocksPanel.tsx`

### Modify
- `src/types/candidate.ts` — `bestSv`, `blockId`, 새 `candidateType` 확장
- `src/types/analysis-run.ts` — `topBlockIds`, `blockCount`, `intersectionReleaseId`
- `src/App.tsx` — 2 라우트 추가
- `src/pages/AnalysisHomePage.tsx`, `AnalysisRunPage.tsx`, `AnalysisStepCandidatesPage.tsx`, `AnalysisStepVariantsPage.tsx`, `CandidateDetailPage.tsx`, `OgDetailPage.tsx`, `RegionPage.tsx`, `DashboardPage.tsx`
- `src/pages/AnalysisStepPages.tsx` — intersections stub 제거 (Step 4 실구현은 별도 파일)
- `src/pages/AnalysisStepIntersectionsPage.tsx` — 실 구현
- `firestore.rules` + `storage.rules` — `analysis_runs/{runId}/blocks/**`, `og_sv_intersections/**` 읽기 규칙 추가, 배포
- Design-doc `analysis-block-ui.md` — `shared_haplotype_block` → `shared_linked_block` 명칭 교체, Codex 보강 반영

### Delete / Deprecate
- ~~`scripts/build-analysis-run.py`~~ — 삭제 완료 (2026-04-22). `promote-analysis-run.py`가 흡수. Python mirror (`functions-python/shared/candidate_scoring.py`) + 관련 테스트도 함께 제거.
- `scripts/build-sv-matrix.py` — 유지. `sv_v1`은 Firestore에 이미 있지만, SV matrix 재돌림은 이 스크립트가 유일한 경로라 canonical path로 남김.

## MVP slicing (design-doc §MVP Path와 정합)

### MVP 1 (이번 Phase A 최소 슬라이스)

End-to-end narrative 도달 가능한 최소 단위.

1. Promote 스크립트 실행 → `analysis_runs/*/blocks`, candidates에 `blockId`·`bestSv`·`candidateType` 채워짐, curated 3개 docs 채워짐
2. `/analysis/:runId/block/:blockId` 기본 페이지 (ConvergentEvidenceCard + Structural + Orthogroup + Narrative) 구현
3. Dashboard + AnalysisHome + AnalysisRunPage에 `Current review blocks` / `Priority blocks` 카드
4. Step 5에 `Jump to block` 칩 + `candidateType`/`bestSv` 컬럼
5. OG detail에 `Candidate blocks in analyses` 카드 + block chip 추가 (OG detail 전면 재작성 전에도)
6. Step 4 intersections를 block-grouped 최소 table로 활성화

검증 목표: "curated BLB block → block detail → Convergent Evidence Card → 목표 문장 2개 노출" 경로가 실제 작동.

### MVP 2

7. AnalysisBlockListPage (`/analysis/:runId/blocks`) — auto + curated 전체 리스트
8. TraitRibbon · PatternChips · JumpToBlock 범용 primitive 삽입 (모든 entity 페이지)
9. OgDetailPage 전면 개편 (§5 layout)
10. Region page `OverlappingBlocksPanel`
11. BlockNarrative template 고도화

### MVP 3

12. Cross-trait shared block view
13. Export bundle (candidates.tsv + intersections.tsv + summary.md) 다운로드
14. Block의 region track visualization (SV / gene / group-specificity 3줄)

## Risks / Open questions

1. **Block 경계 near-boundary 중복 처리** — SV가 1Mb bin 경계에 걸치면 양쪽 block에 노출하거나 "near-boundary" 배지. promote 스크립트에서 결정.
2. **Block type의 `haplotype_block` 명칭** — scope.md 준수를 위해 `shared_linked_block` 권장. 기존 design-doc도 개정 대상.
3. **Candidate에서 `blockId` 채우는 방식** — promote 스크립트가 step5 candidate의 `best_chrom`, `best_start`, `best_end` 로 bin 계산. curated 영역 우선 매칭, 없으면 auto bin.
4. **Scope 준수 auto narrative** — template은 goalposts. 향후 LLM 생성으로 바꾸지 말 것 (template만).
5. **`entity_analysis_index/region_*` 폐기 여부** — coordinate overlap lookup이 더 정확. Phase A에서 region 인덱스 쓰기 중단, `OverlappingBlocksPanel`로 대체.
6. **scoringVersion 1 vs 0 공존** — 기존 `*_sv0_gm11_sc0` runs 유지 (URL/bookmark 호환). 새 `*_sv1_gm11_sc1` 이 default. AnalysisHome listing에 sc1 우선 노출.
7. **`og_sv_intersections` 릴리스 ID** — `int_v1` 확정. 차기 re-run 시 `int_v2` 신설, run doc의 `intersectionReleaseId` 로 버전 고정.
8. **Cultivar coverage 11개 vs 16개** — gene coords / intersections 는 11 품종만. function coverage pill 고정 노출 (Codex 권고).
9. **Design-doc 상태** — draft → MVP1 완료 시 'accepted' 마킹 + MVP1 실제 경로와 차이 기록.

## Verification

- [ ] `scripts/promote-analysis-run.py --dry-run` 통과 (새 스키마 검증)
- [ ] 라이브 실행: `analysis_runs/{runId}/blocks/*` + curated 3 docs + candidates 확장 + entity_index 업데이트
- [ ] `firebase deploy --only firestore:rules,storage` 후 브라우저 읽기 확인
- [ ] `/analysis/:runId/block/curated_blb_chr11_resistance_block` 페이지에서 목표 narrative 2문장 확인
- [ ] `npm run check:all` 통과
- [ ] `/verify general-review` 재수행 (MVP1 완료 후)

## Result (completed 이동 시 작성)

- Status: —
- Notes: —

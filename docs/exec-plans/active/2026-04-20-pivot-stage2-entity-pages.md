# [PLAN] Pivot Stage 2 — entity pages (Gene / OG standalone / Cultivar) + PAV evidence

## Goal

Stage 1에서 정보 아키텍처를 entity-centered로 재프레이밍했으나 **실제 1급 엔티티 페이지(Gene / standalone OG / Cultivar)는 아직 없음**. Stage 2의 목표는 그 페이지들을 실제로 만들어 Stage 1에서 약속한 네비게이션(Dashboard의 4 카드)이 작동하게 하는 것.

이에 더해, scope.md에서 새로 허용한 **evidence-graded PAV state classification** 로직을 OG 페이지에 카드로 붙인다.

완료 기준:
1. `/og/:id`로 standalone OG 페이지 접근 가능 — trait 없이도 OG의 copy count / member / graph / PAV state 열람
2. `/genes/:id`로 gene detail 페이지 접근 가능 — 기본 기능 annotation + orthogroup 링크 + 16 cultivar 분포
3. `/cultivars/:id` 또는 `/cultivar/:name` 확장 — 기존 페이지에 private OG / assembly stats / annotation summary 추가
4. PAV evidence 카드(6 class: `present-complete`, `present-fragmented`, `absent-syntenic-deletion`, `absent-annotation-missing`, `duplicated`, `ambiguous`)가 각 OG × cultivar에 대해 계산되어 OG 페이지에 표시됨
5. Dashboard의 4 entity 카드 중 disabled 상태인 3개(Genes / Orthogroups / Cultivars) 활성화

## Context

### Stage 1 후속
- 2026-04-20 pivot Stage 1 commit `bcf24c0` — Dashboard 리프레이밍, OG Detail의 AF tier gating, scope.md + CLAUDE.md 업데이트 완료
- 현재 OG 상세 페이지는 `/explore/og/:ogId?trait=...`로만 접근 가능 (trait-context 강제). Stage 2에서 `/og/:id`로 독립화
- Gene detail 페이지는 **존재하지 않음**
- Cultivar detail 페이지는 존재 (`/cultivar/:name`) 하지만 phenotype 중심의 간략한 구성

### 데이터 계층 결정 근거 (2026-04-20 분석)

현재 구조: **Firestore = metadata, Cloud Storage = interval/bundle data**. 이미 genomics 엔지니어링의 표준 split을 부분적으로 따르고 있음.

각 query가 Firestore 한계에 걸리는 지점:

| Query 유형 | Firestore 가능? | Stage 2 대응 |
|---|---|---|
| Gene ID 단일 조회 | 가능 (document key) | 그대로 사용 가능 |
| Gene 전체 목록 조회 | 느림 (40k docs) | **precomputed JSON index** on Cloud Storage |
| Gene 기능 annotation keyword search | 불가 (full-text 없음) | **Stage 2B에서 Meilisearch 검토**, 우선 client-side filter로 MVP |
| Gene interval lookup ("chr01:1.2M 근처") | 2D range 제약 | **Stage 2B에서 precomputed chrom-index** (Postgres는 지연) |
| OG 단일 조회 + member | 가능 | 기존 hook 재사용 |
| PAV matrix 전체 필터 | 규모 커지면 비효율 | client-side로 시작, 한계 보이면 Parquet 검토 |
| JBrowse tracks | 해당 없음 | Stage 3 |

**원칙**: 이 Stage 2에서는 **새 데이터 계층(Postgres/Meilisearch)을 도입하지 않는다.** Precomputed JSON index on Cloud Storage로 완주. 한계가 보이면 그 때 Stage 2.5 또는 Stage 4 플랜에서 추가.

### PAV evidence — 단순화된 3-class MVP

scope.md가 허용한 6 class 완전 분류는 gene model completeness (`present-fragmented` vs `present-complete`)와 synteny evidence (`absent-syntenic-deletion` vs `absent-annotation-missing`)를 모두 요구. **Stage 2에서는 3-class 단순화**로 시작하고, 6-class 완전 분류는 gene model/synteny 데이터가 갖춰진 뒤 Stage 2.5로 이월:

Stage 2 MVP PAV class (3):
| Class | 기준 (이 Stage에서 사용 가능한 증거만) |
|---|---|
| `present` | OG에 속한 member가 해당 cultivar GFF3에 1개 이상 annotation |
| `absent-evidence-pending` | GFF3에 member annotation 없음. 이 class는 "진짜 부재"를 의미하지 않고 "annotation만으로는 결론 불가, 추후 synteny/graph 평가 필요"의 플레이스홀더 |
| `duplicated` | GFF3에 member 2개 이상 annotation |

**왜 Stage 2에 이렇게만**: validated PAV claim은 여전히 금지. 이 3-class는 annotation 상태의 단순 요약이고, "not validation-grade" 라벨과 함께 노출. 6-class 확장은 gene model + graph 데이터 통합 후.

## Sub-phases

### Stage 2A — OG standalone page + PAV evidence (단순화 3-class)

**지금 당장 가능**. 기존 hook/데이터 전부 재사용.

**변경 사항**:
- `src/pages/OgDetailPage.tsx`가 이미 존재하지만 `/explore/og/:ogId` 하위 → 새 라우트 `/og/:ogId`로 **동등하게 접근 가능하도록 라우팅 추가**. 기존 경로는 deprecation 표시 없이 유지 (backward compat).
- 페이지 상단에 **PAV evidence 카드** 추가:
  - 16 cultivar × {present / absent-evidence-pending / duplicated} 그리드
  - "not validation-grade" strip 상단 고정
  - 각 cultivar 배지 호버 시 member gene id 표시
- **Trait association은 기존 tab 중 하나** (해당 OG가 trait contrast에서 상위인지). Trait context 없이 페이지 접근 시 해당 tab 접힘.

**신규/수정 파일**:
- `src/App.tsx` — `<Route path="/og/:ogId" element={<OgDetailPage />} />` 추가
- `src/lib/pav-evidence.ts` — 신규. `classifyPavEvidence(ogCoords)` 순수 함수. 3-class.
- `src/components/og-detail/OgPavEvidenceCard.tsx` — 신규
- `src/pages/OgDetailPage.tsx` — PAV card 삽입, 라우트 변경 영향 검토 (useParams + useLocation)

### Stage 2B — Gene detail page + gene search

**데이터 인덱스 선결 작업 필요**.

**선결: Gene index precomputation**
- Server-side script (`scripts/build-gene-index.py`) — 기존 GFF3들을 읽어 다음 구조로 Cloud Storage에 저장:
  - `gene_index/v{of}/genes.json` (gene ID → cultivar, chr, start, end, functional annotation 요약)
  - `gene_index/v{of}/by_chr/<cultivar>/<chr>.json` (chr별 sorted gene list — interval lookup 전용)
  - `gene_index/v{of}/search_index.json` (client-side fuzzy search용 keyword list)
- 크기 추정: 40k genes × 16 cultivars × ~500 bytes/entry ≈ 320 MB 전체. **청크 단위로 분산 저장**해 lazy load.
- 실행 시점: OrthoFinder 버전 변경 시. Cloud Run cron 또는 admin 수동 트리거.

**UI**:
- Dashboard의 "Genes" 카드 활성화 → `/genes` 검색 홈
- `/genes?q=...` — keyword/ID 검색 결과 리스트
- `/genes/:geneId` — gene detail 페이지

**Gene detail 섹션**:
| 섹션 | 데이터 출처 |
|---|---|
| Header (ID, cultivar, coord, strand) | gene_index/genes.json |
| Functional annotation | GFF3 attributes (precomputed) |
| Orthogroup membership | Orthogroups.tsv (기존 drilldown 데이터 재사용) |
| 16 cultivar copy mini-matrix | 기존 OG drilldown + diff 데이터 |
| Local graph mini-view | 기존 graph bundle에서 해당 cluster 로드 |
| Overlapping variants | 기존 og_region_af bundle |
| Trait association | OG 페이지로 링크 (gene → og → trait) |

**검색 로직 — Stage 2B MVP**:
- Client-side fuzzy: 약 40k gene ID + 기능 annotation keyword를 `search_index.json` (수 MB) 로 lazy load 후 Fuse.js 또는 단순 substring match
- 문제 규모가 작아 Meilisearch 불필요
- 성능 한계 시 Stage 2.5에서 Meilisearch 검토

**신규/수정 파일**:
- `scripts/build-gene-index.py` — 신규 server-side
- `src/hooks/useGeneIndex.ts` — 신규 (lazy load + cache)
- `src/hooks/useGene.ts` — 신규 (단일 gene 조회)
- `src/pages/GeneSearchPage.tsx` — 신규
- `src/pages/GeneDetailPage.tsx` — 신규
- `src/App.tsx` — 라우트 추가
- `src/components/dashboard/EntityCardsGrid.tsx` — Genes 카드 활성화

### Stage 2C — Cultivar page expansion

기존 `/cultivar/:name` 페이지 확장.

**추가 섹션**:
- Assembly stats (total length, chr count, contig N50)
- Annotation stats (gene count, mean CDS length)
- Repeat composition (데이터 있으면)
- Private OG list (16 cultivar 중 이 cultivar에만 있는 OG)

**데이터 출처**:
- Assembly stats: 수동 큐레이션된 Firestore 문서 (존재하지 않으면 placeholder + admin 입력 UX 추가)
- Private OG: Orthogroups.GeneCount.tsv 읽어 precompute → `cultivar_summary/v{of}/<cultivar>.json`
- Annotation stats: gene_index 부산물

**신규/수정 파일**:
- `scripts/build-cultivar-summary.py` — 신규
- `src/hooks/useCultivarSummary.ts` — 신규
- `src/pages/CultivarDetailPage.tsx` — 확장
- `src/components/dashboard/EntityCardsGrid.tsx` — Cultivars 카드 활성화 (기존 cultivar list UX로 이동)

## Files to modify — 전체 요약

**2A (당장 가능)**
- `src/App.tsx` — `/og/:ogId` 라우트
- `src/lib/pav-evidence.ts` (신규)
- `src/components/og-detail/OgPavEvidenceCard.tsx` (신규)
- `src/pages/OgDetailPage.tsx`

**2B (gene index 선결 후)**
- `scripts/build-gene-index.py` (신규)
- `src/hooks/useGeneIndex.ts` (신규)
- `src/hooks/useGene.ts` (신규)
- `src/pages/GeneSearchPage.tsx` (신규)
- `src/pages/GeneDetailPage.tsx` (신규)
- `src/App.tsx` (라우트)
- `src/components/dashboard/EntityCardsGrid.tsx`

**2C (cultivar summary 선결 후)**
- `scripts/build-cultivar-summary.py` (신규)
- `src/hooks/useCultivarSummary.ts` (신규)
- `src/pages/CultivarDetailPage.tsx` (확장)
- `src/components/dashboard/EntityCardsGrid.tsx`

## Scope boundaries (무엇이 Stage 2 밖인가)

- **Meilisearch / Postgres 도입** — 이 Stage에선 없음. 필요성 관찰 후 Stage 2.5 또는 Stage 4.
- **JBrowse 2 embed** — Stage 3.
- **6-class PAV 완전 분류** — gene model completeness + synteny 데이터 통합 후 Stage 2.5로 이월.
- **Server API / FastAPI backend** — Stage 4.
- **Non-reference sequence explorer** — 대안 비전 문서의 novel contribution 중 하나지만 Stage 3 이후.
- **Batch liftover / coordinate conversion API** — Stage 3+.

## Risks / Open questions

- **Gene index 크기**: 40k × 16 cultivars × functional annotation은 수백 MB. 청크 전략 (chr별 or cultivar별) 검토 필요. 잘못 설계하면 페이지 로드가 느려짐. → 실제 GFF3 파일 크기 확인 후 샘플 1개로 dry-run 추천.
- **OrthoFinder 버전과 gene index 버전 동기화**: 현재 OG diff 문서의 `orthofinderVersion`과 gene index가 일치해야 함. Version mismatch 시 gene → OG 링크가 깨짐. → gene index에도 `orthofinderVersion` 박아두고 mismatch 시 UI 경고.
- **PAV 3-class의 제품 표현**: "absent-evidence-pending"은 정직하지만 투박함. UI에선 `— 미판단` 또는 `? (annotation only)` 같은 약한 시각적 표기가 더 나을 수 있음. 클래스 이름은 내부, UI label은 별도.
- **라우트 중복** (`/og/:id` vs `/explore/og/:ogId`): 동일 페이지 2 경로. Stage 2에선 둘 다 허용. Stage 3에서 `/explore/og/:ogId` deprecation.
- **Private OG 계산의 scope 해석**: "1/16만 있는" OG와 "OrthoFinder가 singleton으로 본" OG는 다름. 전자는 panel-relative, 후자는 OrthoFinder 내부. 제품 용어 통일 필요.
- **Gene search UX의 grouping**: ID 정확 일치 vs functional keyword 결과가 한 리스트에 섞이면 혼란. 별도 섹션.
- **GFF3 품질 편차**: 16 cultivar 각각의 annotation pipeline이 동일한지 확인 필요. 편차 크면 PAV evidence 자체가 artefact.

## Sub-phase ordering recommendation

실행 순서 (선행 의존 기준):

1. **2A** — 의존 없음. 당장 1-2주 안 완주 가능.
2. **2C** — cultivar summary script + UI 확장. 병렬 가능.
3. **2B** — gene index 선결 작업이 가장 크고 품질 리스크도 큼. 2A/2C 후 진행.

Stage 1에서 Dashboard 카드 3개를 disabled 둔 순서상 사용자 시각으로는 2B를 먼저 기대하지만, 엔지니어링 리스크 순으로는 2A → 2C → 2B가 맞음.

## Verification

- [ ] `npm run check:all` 통과
- [ ] 2A: `/og/:ogId` 직접 접근 (trait 없이) 정상 렌더
- [ ] 2A: PAV evidence 카드가 16 cultivar 전부에 대해 present/absent-evidence-pending/duplicated 중 하나 표시
- [ ] 2B: Gene search 페이지에서 ID로 검색 시 정확히 매칭, keyword 검색 시 (MVP 수준의) 결과 반환
- [ ] 2B: Gene detail 페이지가 기능 annotation + OG 링크 + 16 cultivar 분포 모두 표시
- [ ] 2C: Cultivar detail에 private OG 리스트 + assembly stats + annotation stats 추가 표시
- [ ] Dashboard 4 카드 전부 활성화, 링크 동작 확인

## Result (completed 이동 시 작성)
- Status: TBD
- Notes: TBD

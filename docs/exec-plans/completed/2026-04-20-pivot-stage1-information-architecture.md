# [PLAN] Pivot Stage 1 — information architecture (entity-centered spine)

## Goal

2026-04-20 scope.md 개편(phenotype-first → entity-centered)의 Stage 1. Firebase 유지, 코드 재사용 극대화, **랜딩 서사 + OG Detail AF 강등**이 핵심. Stage 2–4는 별도 플랜.

완료 기준:
1. Dashboard hero가 "comparative pangenome resource"로 리프레이밍되고 4-entity 진입 카드가 추가됨
2. `/explore` 페이지가 "Trait Association (beta)" 모듈로 라벨 변경, 내부 동작은 유지
3. OG Detail drawer의 AF panel이 tier gating 적용되어 representative/mixed/nonrepresentative에 따라 다르게 표시
4. 각 주요 surface에 per-panel scope strip이 있고, 기존 `<details>` ScopePanel은 제거 또는 축소
5. `CLAUDE.md`·`scope.md`의 새 정체성과 UI 전체가 일관됨

## Context

- 2026-04-20 verify 결과 entity spine 전환이 (C) hybrid/staged로 확정
- 사용자 지시: "dashboard를 홈으로 유지"
- 현재 실행 중인 extractor는 그대로 끝내되 결과물은 "trait-ranked candidate"가 아닌 "comparative evidence"로 재라벨
- P1 observability 작업(런타임 status discriminator + release preflight)은 이미 머지됨 — 이번 플랜과 독립
- Stage 1은 **신규 페이지(Gene/Cultivar standalone) 없음**. 기존 페이지의 재프레이밍 + OG AF tier gating만

## Scope boundaries (무엇이 Stage 1 밖인가)

- `/genes/:id` 신규 페이지 → Stage 2
- `/og/:id` standalone (drawer → page) → Stage 2
- `/cultivars/:id` 확장 → Stage 2
- JBrowse 2 임베드 → Stage 3
- Variant browser · server API · Postgres → Stage 4
- PAV evidence classification 로직 자체 (state 계산) → Stage 2 (지금은 UI 라벨링만)

Stage 1엔 **새 백엔드 로직이 거의 없음**. AF tier 계산은 클라이언트에서 기존 graph 데이터로 산출.

## Approach

### Part A — Dashboard 리프레이밍

`src/pages/DashboardPage.tsx` 수정:

**Hero 섹션**
- 제목: "Phenotype-driven candidate discovery for Korean rice" → **"Korean japonica comparative pangenome resource"**
- 본문: 현재 carrier 문장을 entity-centered 설명으로 교체
  - 예: "Explore de novo assemblies, gene annotations, orthogroups, and pangenome graph across 16 Korean temperate japonica cultivars. Phenotype-associated candidates are available as one of several analysis surfaces."
- 상단 통계 줄(panel stats): `cultivars loaded`, `traits`, `Cactus pangenome`, `OrthoFinder`, `IRGSP` 유지 — 이건 factual observation, 프레이밍과 무관
- Primary CTA "Start exploring candidates →" **제거**. 아래 4-card 그리드로 분산.

**4-entity 카드 그리드 (신규)**
- 컴포넌트: `src/components/dashboard/EntityCardsGrid.tsx` 신규 작성
- 4개 카드:
  1. **Genes** — `coming soon` (Stage 2), disabled 상태
  2. **Orthogroups** — `coming soon` (Stage 2), disabled 상태
  3. **Cultivars** — 활성. `/cultivars` (기존 cultivar list가 있으면 재사용, 없으면 dashboard의 cultivar lookup으로 임시 안내)
  4. **Trait Association (beta)** — 활성. `/explore`로 연결
- 각 카드는 제목 + 1줄 설명 + disabled인 것은 회색조
- 4개가 시각적으로 **동등한 비중** — Trait이 특권 없음

**유지되는 섹션**
- Cultivar lookup aside — 그대로 (Stage 2에서 `/cultivars/:id` 경로 통일 시 링크만 변경)
- PhenotypeDistributionChart — 그대로 (factual data summary)
- TraitQualityOverview — 그대로 (오히려 "일부 trait만 usable"을 드러내는 역할 강화)

### Part B — `/explore` 페이지 리라벨

`src/pages/ExplorePage.tsx` 수정:

- 페이지 헤더 제목: "Explore Candidates" → **"Trait Association (beta)"**
- 서브타이틀: "Orthogroups ranked by copy-count contrast..." 유지하되, 상단에 **scope strip** 한 줄 고정 추가:
  - "Candidate prioritization for phenotype follow-up. Not causal. Not marker-ready. Anchor-locus AF is tier-gated — see per-OG evidence."
- 상단 `PANEL_LABEL.panelSize` 언급 유지 (factual)
- **라우팅은 유지**. `/explore?trait=...&og=...` 구조 그대로. Stage 2에서 `/traits/:trait` 경로 통일 시 리다이렉트 처리.

### Part C — OG Detail AF tier gating (핵심 방법론 교정)

현재 OG drawer가 AF panel을 headline으로 노출 중. tier gating으로 교체.

**신규 파일: `src/lib/og-anchor-tier.ts`**

```ts
export type AnchorRepresentativenessTier = 'representative' | 'mixed' | 'nonrepresentative';

export interface TierMetrics {
  occupancy: number;       // fraction of cultivars with annotated OG member at anchor locus
  elsewhere: number;       // fraction with OG member but not at anchor
  noAnnotation: number;    // fraction without any OG member
  cultivarCount: number;
  tier: AnchorRepresentativenessTier;
}

export function classifyAnchorTier(
  paths: TubeMapPath[],
  coords: OgGeneCoords,
): TierMetrics
```

로직:
- 각 path에 대해 `getPathAnnotationStatus()` 호출 (기존 `path-annotation-overlap.ts` 재사용)
- Reference path는 분류에서 제외 (IRGSP는 평가 기준이 아님)
- 집계:
  - `annotated_here` → occupancy
  - `elsewhere_same_chr` / `elsewhere_other_chr` → elsewhere
  - `no_annotation` → noAnnotation
- Tier 매핑 (scope.md 정의):
  - `representative`: occupancy ≥ 0.70 AND elsewhere ≤ 0.20
  - `mixed`: 0.40 ≤ occupancy < 0.70 OR elsewhere > 0.20
  - `nonrepresentative`: occupancy < 0.40

**신규 컴포넌트: `src/components/explore/OgAnchorTierBadge.tsx`**
- 3 tier를 색상으로 표시 (초록 / 앰버 / 회색)
- 호버 툴팁에 수치 (`occupancy 12/16, elsewhere 2/16, no annotation 2/16`)

**수정: `src/components/explore/OgDrawerAlleleFreqSection.tsx` (존재하는 파일)**

현재 확인된 파일 구조 기반:
- AF section을 tier 별로 다른 UI로 렌더:
  - `representative`: 기존 그대로, 단 제목을 **"Anchor-locus variants"**로 변경, 상단에 "Sequence contrast at the anchor locus. Not an OG-wide claim." strip
  - `mixed`: aggregate 숫자 기본 접힘. "이 OG는 품종별 구조가 혼합되어 있어 anchor-locus AF를 OG-level 신호로 읽지 마십시오." strip. 사용자가 펼쳐야 variant table 보임
  - `nonrepresentative`: 기본 완전 숨김. "Anchor locus represents this OG poorly (<40% occupancy). AF panel disabled by default." 안내만 표시. 명시적 "Show anyway" 버튼으로만 열림
- Tier badge를 OG 제목 옆에 노출

**수정: `src/components/explore/OgDrawer.tsx`**
- AF panel을 `<details>` 탭 구조로 변경 (현재 inline인지 확인 후 조정)
- Tier 결과에 따라 탭 default open 상태 다름

### Part D — ScopePanel 제거 → per-panel scope strip

현재 `src/components/og-detail/ScopePanel.tsx`은 OG 상세 내 접힌 `<details>` 블록. Stage 1에서 다음으로 대체:

**신규 컴포넌트: `src/components/common/ScopeStrip.tsx`**
- 1–2줄 inline notice, 색상 약하게 (회색 배경 + 작은 글씨)
- 각 surface에 맞는 문구 전달

**적용 위치**
- Dashboard hero 아래: 필요 없음 (hero 본문이 이미 역할)
- `/explore` 헤더: `"Candidate prioritization for phenotype follow-up. Not causal. Not marker-ready."`
- OG drawer 상단: `"Orthogroup-level evidence. Anchor-locus variants are shown as locus-local evidence only, gated by anchor representativeness."`
- AF panel 내부 (tier별 다른 문구 — Part C 참조)

기존 `ScopePanel.tsx`는 **제거**. 이유: 접힌 `<details>`는 실제로 안 읽힘, CAN/CANNOT 리스트는 `scope.md`로 이전 완료, lab checklist는 사용자 몫(scope.md의 "Next recommended checks"로 남김).

### Part E — 네비게이션 & 잔여 정비

- Top nav (존재한다면): "Explore" 링크 라벨을 "Trait Association"으로 변경
- 푸터/사이드바의 "candidate discovery" 언급을 "comparative resource · trait module" 형태로 교체
- README 상단 문구 sync (scope.md 인용)
- `docs/product-specs/idea.md`는 건드리지 않음 (history 유지, 차후 별도 정리)

## Files to modify

**scope / identity (완료):**
- ~~`docs/product-specs/scope.md`~~ (이 플랜 머지 전 이미 업데이트됨)
- ~~`CLAUDE.md`~~ (이 플랜 머지 전 이미 업데이트됨)

**Dashboard (Part A):**
- `src/pages/DashboardPage.tsx` — hero copy + CTA 구조 변경
- `src/components/dashboard/EntityCardsGrid.tsx` — 신규

**Explore rebrand (Part B):**
- `src/pages/ExplorePage.tsx` — 헤더 제목 + 상단 strip

**OG Detail AF tier gating (Part C):**
- `src/lib/og-anchor-tier.ts` — 신규
- `src/components/explore/OgAnchorTierBadge.tsx` — 신규
- `src/components/explore/OgDrawerAlleleFreqSection.tsx` — tier별 렌더
- `src/components/explore/OgDrawer.tsx` — tier badge 노출 + AF 섹션 구조 조정

**Scope strip (Part D):**
- `src/components/common/ScopeStrip.tsx` — 신규
- `src/components/og-detail/ScopePanel.tsx` — 제거

**네비 (Part E):**
- Top nav 컴포넌트 (있으면) — 라벨 변경
- `README.md` (있으면 루트 README 동기화 — 없으면 스킵)

## Risks / Open questions

- **기존 cultivar list 페이지 존재 여부 미확인** — `/cultivars` 경로가 있다면 재사용, 없으면 Stage 1에선 카드 disabled 처리하고 Stage 2에서 구현. 구현 시작 전 `src/App.tsx` 라우팅 재확인 필요.
- **AF section 현재 위치 확인 필요** — `OgDrawerAlleleFreqSection.tsx`가 drawer 내 inline인지, 별도 탭인지. 구현 시 `OgDrawer.tsx`와 같이 열고 구조 판단.
- **Tier 임계값 refinement** — `representative ≥ 0.70` 등은 initial estimate. Stage 2에서 실제 데이터 관찰 후 조정 가능. Stage 1 코드에는 상수로 두되 `og-anchor-tier.ts` 상단에 "initial estimate, refine with data" 코멘트.
- **Reference path 제외 처리** — `isReferencePathCultivar()` (기존 유틸) 재사용. IRGSP path는 tier 계산 대상에서 배제.
- **기존 `⊘` badge와 tier badge의 중복 정보** — 둘이 같은 evidence 기반. Stage 1에선 둘 다 유지 (path-level badge는 세부, tier badge는 요약). Stage 2에서 통합 검토.
- **일관성 위험**: 여러 surface의 copy 변경이 많음. scope.md의 Declaration 문장을 단일 진실로 취급하고, 다른 곳에서는 짧게 참조하거나 재표현.

## Verification

- [ ] `npm run check:all` 통과
- [ ] `npm run dev`로 Dashboard 확인 — 새 hero, 4-card grid, 기존 차트 모두 렌더
- [ ] `/explore?trait=heading_date` 방문 — 헤더가 "Trait Association (beta)"로 표시, scope strip 노출
- [ ] OG drawer 열기 — tier badge 표시, AF section이 tier에 따라 다르게 보임
  - representative 케이스: 정상 표시
  - mixed 케이스: aggregate 접힘, 경고 strip
  - nonrepresentative 케이스: 기본 숨김, "Show anyway" 버튼
- [ ] ScopePanel 접힌 블록이 OG 상세에서 더 이상 보이지 않음
- [ ] scope.md / CLAUDE.md의 Declaration 문장과 Dashboard hero 본문이 의미상 일치

## Result (completed 이동 시 작성)
- Status: DONE
- Notes: Dashboard/entity framing, Trait Association relabeling, scope strips,
  and anchor-tier gating are reflected in the current app and product scope.
  Later analysis-module routing superseded some `/explore` details.

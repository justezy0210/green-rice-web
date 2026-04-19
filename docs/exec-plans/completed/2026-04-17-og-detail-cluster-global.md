# OG Detail — Cluster Global State + Evidence Consistency (P0)

Status: active — 2026-04-17

## Problem

OG Detail 페이지의 해석 단위(cluster anchor)가 UI에 일관되게 반영되지 않는다.

- 헤더 `Anchor: {cultivar}`는 전역처럼 보이지만 실제로는 Gene Locations 탭에서만 조작 가능
- AF 탭과 Pangenome Graph 탭은 cluster 선택에 반응하지 않음 (선택이 바뀌어도 동일 데이터)
- `Gene-region Variants` 라벨은 데이터 범위(gene body only) 과장
- Non-IRGSP-linked OG의 경우 헤더 정보가 공백에 가까움

Codex/Claude 교차 검증 결과 P0로 분류된 3개 이슈만 본 플랜 범위. P1(Summary 탭), P2(cluster 랭킹)는 별도 플랜.

## Goal

"선택한 cluster가 페이지 전체의 해석 컨텍스트"라는 모델을 UI가 정확히 반영하게 만든다.

## Approach

### 1. Cluster selector를 탭 위 전역 컨트롤로 승격

- 헤더 카드 하단에 선택 상태 고정 영역 추가:
  ```
  Selected cluster  [{cultivar} · {chr}:{span} · N genes  ▾]
  ```
- 드롭다운(또는 chips) 클릭 시 전체 cluster 목록 표시 (그룹별 정렬 유지)
- URL `?cluster=` 파라미터는 그대로 — 지금도 URL 기반 전역 상태로 이미 구현되어 있음

### 2. AF + Graph 탭을 cluster-aware로 배선

현재 구현 기준:
- `useOgAlleleFreq(traitId, v, g)` — OG 단위 전체 반환 (cluster 무관)
- `useOgTubeMap(ogId)` — OG 단위 전체 반환 (cluster 무관)

단기 해결(데이터 파이프라인 완성 전):
- AF 탭: 선택 cluster의 `chr:start-end` 범위로 기존 AF 데이터를 **클라이언트에서 필터**. 필터 결과가 비면 명시적으로 `No variants in selected cluster span` 표시
- Graph 탭: 아직 cluster-aware 데이터 파이프라인(`og_region/{ogId}/{clusterId}.json`)이 없으므로 명시적 경고 표시: `Graph not yet regenerated for selected cluster — showing IRGSP-anchored default`

중기 해결 (다음 플랜):
- `og_region/` 파이프라인 배포 후 `useOgRegion(ogId, clusterId)` 훅 추가, 탭 데이터 교체

### 3. 라벨 및 경고 보수화

- 탭 라벨: `Gene-region Variants` → `Gene-body Variants`
- 탭 내부 경고 배너: `Variants shown for gene body only. Promoter/upstream regulatory variants not included.`
- 헤더 anchor 표현은 "Selected cluster"로 명확화 (anchor라는 다의어 제거)

### 4. Non-IRGSP fallback 헤더

- `rep == null` 케이스에 대해 대체 표현:
  - `No IRGSP-linked representative transcript`
  - 부연: `{N} cultivars · {M} genes · span ~{Kbp} (cultivar consensus)`
- AF 탭 fallback 메시지는 현재 "AF requires IRGSP gene region mapping" 유지 (정확함)
- Graph 탭도 동일하게 anchor 부재 경고 유지

## Files to modify

- `src/pages/OgDetailPage.tsx` — header 재편, cluster 전역 제어, 탭 라벨 수정
- `src/components/og-detail/OgDetailAlleleFreqTab.tsx` — cluster prop 추가, 클라이언트 필터, 경고 배너
- `src/components/og-detail/OgDetailGraphTab.tsx` — cluster prop 추가, cluster mismatch 경고
- `src/components/og-detail/OgDetailGeneTab.tsx` — cluster picker affordance 축소 (전역으로 이동되었으므로 중복 강조 제거)
- (필요 시) `src/components/og-detail/ClusterSelector.tsx` — 신규 컴포넌트
- `src/lib/og-variant-filter.ts` — 신규: cluster 범위로 OgVariantSummary 필터

## Non-goals (별도 플랜)

- Summary 탭 신설 (P1)
- Cluster 랭킹/추천 기준 (P2)
- `og_region/` 파이프라인 구현 — `2026-04-17-cultivar-anchor-system.md`에 이미 있음
- Promoter 영역 확장 — 별도 데이터 파이프라인 작업

## Risks / Open questions

1. **AF 클라이언트 필터의 범위 정합성**: cluster span을 계산할 때 anchor는 cultivar 좌표인데 AF는 IRGSP 좌표 기준이다. IRGSP-linked cluster만 의미 있는 필터가 되고, 비-IRGSP cluster 선택 시 필터가 오작동할 수 있음 → 비-IRGSP cluster는 AF 탭을 명시적으로 `N/A`로 표시하는 것이 안전.
2. **Graph 경고 피로도**: cluster가 바뀔 때마다 경고가 뜨면 거슬릴 수 있음. "showing default" 뱃지 정도로 약하게.
3. **드롭다운 vs chips 선택**: cluster 수가 많을 때(>20) chips는 줄바꿈 폭주. 드롭다운이 안전.
4. **cluster 기본 선택 규칙**: 현재 `clusters[0]`. 이 플랜에서는 유지. 랭킹은 P2.

## Verification

- [ ] `npm run check:arch` 통과
- [ ] `npm run build` (tsc) 통과
- [ ] 수동: cluster 변경 시 AF 탭이 필터 반영, Graph 탭이 경고 표시
- [ ] 수동: Non-IRGSP OG 방문 시 fallback 헤더 정상
- [ ] `/verify plan-review` 통과 (본 문서)
- [ ] `/verify script-review` 통과 (구현 완료 후)

## Result (completed 이동 시 작성)

- Status:
- Notes:

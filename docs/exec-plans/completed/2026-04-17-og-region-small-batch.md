# OG Region — Small Batch Pipeline (Path B, 50 OG pilot-to-prod)

Status: active — 2026-04-17

## Problem

Pilot v3 (`scripts/pilot-region-extract.py`)가 97/100 성공률로 cluster-specific tube map + AF 추출을 검증했다. 이제 cluster-aware Graph/AF 데이터를 실제로 배포하고 프론트엔드를 연결하면 "cluster를 바꾸면 그 자리의 증거가 보인다"는 UX를 UI 개편 없이 실현 가능하다.

대상: heading_date trait의 candidate OG 중 **IRGSP-linked top 50**. 전체 candidate로 확장하기 전에 end-to-end 한 바퀴를 완성하기 위한 소규모 배치.

## Goal

- `og_region/{ogId}/{clusterId}.json` artifact를 50 OG × 평균 ~2 cluster 분량 (총 ~100 region) 생성
- 프론트엔드 `OgDetailGraphTab`이 선택 cluster에 맞춰 fetch & render
- "cluster 선택 → graph 갱신"이 실제로 동작하는 한 사이클 완주

## Non-goals

- 전체 candidate OG 배치 (별도 플랜)
- 다른 trait (heading_date 외)
- AF 탭 cluster-aware 재배선 (현 단계는 graph만 증거로 사용; AF는 다음 단계)
- Promoter 확장
- P1 Summary 탭, P2 cluster 랭킹

## Approach

### Step A — Candidate 선정 스크립트

`scripts/select-candidate-ogs.py`:
- 입력: `orthogroup_diffs/v{N}/g{M}/heading_date.json` (diff payload), `og_gene_coords/chunk_*.json`
- 필터: representative.transcripts 존재 (IRGSP-linked)
- 정렬: `|meanDiff|` 내림차순
- 상한: top 50
- 출력: `og_id\tcategory` TSV

### Step B — Batch 추출 스크립트

`scripts/batch-region-extract.py` (pilot v3의 확장):
- 입력: 후보 OG TSV, GBZ, HAL, VCF, coords
- **각 OG의 모든 cluster** 루프 (pilot은 첫 cluster만)
- **Cluster cap**: OG당 최대 5개 (multi_copy 폭주 방지)
- Per-cluster output: `og_region/{ogId}/{clusterId}.json` — schema Step 4 RegionData
- Manifest: `og_region/_manifest.json` — `{ ogId: [{ clusterId, status, hasGraph, hasAf, variantCount }, ...] }`
- Retry/skip: 실패한 cluster는 manifest에 status: 'error' + errorMessage 기록, batch 계속 진행

### Step C — 배포

사용자가 서버에서 실행 후 Firebase Storage `og_region/` 경로로 업로드:
- `og_region/_manifest.json`
- `og_region/OG{NNNNNNN}/{clusterId}.json` × N

Storage rules(`og_region/{path=**}`)는 이미 public read. 변경 불필요.

### Step D — 프론트엔드 훅

- `src/types/orthogroup.ts`: `RegionData` 타입 추가 (Step 4 schema)
- `src/lib/og-region-service.ts`: `fetchOgRegion(ogId, clusterId)` 추가
- `src/hooks/useOgRegion.ts`: 신규. `(ogId, clusterId) => { data, loading, error }`
- `src/hooks/useOgRegionManifest.ts`: 신규. 매니페스트 캐시. cluster 없는 OG / 실패 cluster 판정용.

### Step E — OgDetailGraphTab 배선

- 현재: `useOgTubeMap(ogId)` — OG 단위 IRGSP default graph
- 변경: `useOgRegion(ogId, selectedClusterId)` 우선 시도
  - manifest가 있고, 선택 cluster가 covered → region data의 graph 렌더
  - 없으면 기존 `useOgTubeMap` fallback + `Graph source: IRGSP default` 배지
- Props: `selectedClusterId` 추가 (OgDetailPage에서 이미 관리 중)

### Step F — 수동 검증

- top 10 OG 기준으로 cluster 변경 → graph 변경 확인
- manifest에서 실패 cluster UI 표시 (회색 + "graph extraction failed")
- non-IRGSP fallback (기존 tube map 계속 보임) 확인

## Files to modify / create

신규:
- `scripts/select-candidate-ogs.py`
- `scripts/batch-region-extract.py`
- `src/hooks/useOgRegion.ts`
- `src/hooks/useOgRegionManifest.ts`

수정:
- `src/types/orthogroup.ts` — `RegionData`, `OgRegionManifest` 타입 추가
- `src/lib/og-region-service.ts` — fetchOgRegion, fetchOgRegionManifest 추가
- `src/components/og-detail/OgDetailGraphTab.tsx` — cluster-aware 분기
- `src/pages/OgDetailPage.tsx` — selectedClusterId를 synteny tab에 전달

변경 없음: `storage.rules`(이미 적용), `OgDetailAlleleFreqTab`(다음 단계)

## Risks

1. **Cluster id 안정성**: 현 `${cultivar}_${chr}_${start}` 형식. 좌표 인덱스가 재생성되면 id가 바뀔 수 있음 → 배치 결과의 deep link 호환성 깨짐. 당분간 `gene_coords` 재생성 금지.
2. **Cluster 수 폭주**: multi_copy OG에서 5+ 가능. cap=5로 잘라내되, 잘린 사실을 manifest에 `truncated: true`로 기록.
3. **비-IRGSP cluster anchor**: cluster anchor는 cultivar 좌표 → halLiftover 가능해야 AF 의미 있음. graph는 가능, AF는 liftover 결과에 따라 skip.
4. **pilot과 production 좌표 시스템 동일 확인**: pilot v3의 local coord 변환 로직 그대로 사용.

## Verification

- [ ] `npm run check:arch`
- [ ] `npm run build`
- [ ] `select-candidate-ogs.py` 로컬 dry-run → 50 OG TSV 생성
- [ ] `batch-region-extract.py` 사용자 서버 실행 → manifest 성공률 ≥ 90%
- [ ] Storage 업로드 + 프론트 수동 검증 (10 OG)
- [ ] `/verify script-review` 통과 (배치 스크립트)

## Result (completed 이동 시 작성)

- Status:
- Notes:

# Orthogroup Diff — Storage-backed Pagination (v2 design)

Status: active — 2026-04-16
Depends on: completed/2026-04-15-orthogroup-differential.md, completed/2026-04-15-og-gene-drilldown.md

## Problem

`orthogroup_diffs/{traitId}` Firestore 문서의 `top[]`가 `MAX_CANDIDATES=200`으로 잘린다. 실제 선택 필터(raw p-value < 0.05, |Δmean| ≥ 0.5)를 통과한 OG가 많은 trait은 passedCount ≈ 1,045까지 나오는데 상위 200개 외엔 UI에서 사라진다. Firestore 단일 문서 1MB 한계 때문에 `top[]`에 통째로 더 담을 수도 없다.

## Goal

- passedCount 전수를 보존 및 표시 (cap 제거)
- 테이블은 50개/페이지 pagination
- Firestore 실시간 메타데이터 + Storage 본문의 2단 구조
- 재현성, 캐시 무효화, 마이그레이션, 실패 처리 명시

## Design v2

### 1. Storage path — immutable versioned

```
orthogroup_diffs/v{orthofinderVersion}/g{groupingVersion}/{traitId}.json
```

- `overwrite` 회피 → 재현성/롤백/캐시 오염 방지
- Firestore metadata가 `storagePath`로 정확한 파일을 가리킴
- orthofinder or grouping version 어느 쪽이든 바뀌면 새 경로 → onSnapshot이 storagePath 바뀐 걸로 감지 → 프런트 재fetch

### 2. Payload schema (Storage JSON)

```typescript
interface OrthogroupDiffPayload {
  schemaVersion: 1;
  traitId: TraitId;
  groupLabels: string[];
  entries: OrthogroupDiffEntry[];   // passedCount 전부. selectionMode='top_n_fallback'일 땐 entryCount != passedCount
  entryCount: number;               // entries.length
  passedCount: number;
  selectionMode: SelectionMode;
  thresholds: OrthogroupDiffThresholds;
  computedAt: string;
  orthofinderVersion: number;
  groupingVersion: number;
}
```

`OrthogroupDiffEntry`는 기존 타입을 그대로 재사용하되, 구현 시 가장 큰 OG 기준 payload 크기를 1회 측정 후 문서화 (아래 QC 참조).

### 3. Firestore document (metadata only)

```typescript
interface OrthogroupDiffDocument {
  traitId: TraitId;
  groupLabels: string[];
  selectionMode: SelectionMode;
  thresholds: OrthogroupDiffThresholds;
  totalTested: number;
  passedCount: number;
  entryCount: number;
  computedAt: string;
  groupingVersion: number;
  orthofinderVersion: number;
  schemaVersion: 1;
  storagePath: string;        // versioned path above
  // top[] 제거
}
```

### 4. Write protocol (Python side)

순서 강제:

1. Storage `storagePath`에 payload JSON upload
2. `blob.reload()` 후 존재/크기 확인
3. 성공 시에만 Firestore metadata doc overwrite (`set()`)
4. 실패 시 Firestore doc는 갱신 안 함 → 이전 상태 유지 (구 payload 경로가 살아있거나, 둘 다 없으면 empty)

지난 버전 Storage 파일은 즉시 삭제하지 않음 (immutable versioned path라 자연스럽게 누적). 정리 정책은 별도 과제 — 관측 후 결정.

### 5. Frontend data model

```typescript
type EntriesState =
  | { kind: 'idle' }
  | { kind: 'loading'; storagePath: string }
  | { kind: 'ready'; storagePath: string; payload: OrthogroupDiffPayload }
  | { kind: 'legacy'; entries: OrthogroupDiffEntry[] }      // 구 top[] fallback
  | { kind: 'error'; storagePath: string; message: string };
```

우선순위:
- `meta.storagePath` 있으면 Storage fetch → ready
- 없고 legacy doc에 `top[]` 있으면 legacy
- 둘 다 없으면 empty/error

`subscribeOrthogroupDiff`는 Firestore onSnapshot 유지 (메타만 실시간). entries는 `useOrthogroupDiffEntries(storagePath)`가 fetch + in-memory cache.

**Cache key는 `storagePath` 그 자체.** computedAt 아님. immutable path라 storagePath 다르면 데이터도 다름 (재계산 시 경로 달라져야 정상).

### 6. Runtime validation

Firestore doc과 Storage payload 둘 다 최소한의 shape guard 통과:

```typescript
function isDiffDocument(v: unknown): v is OrthogroupDiffDocument { ... }
function isDiffPayload(v: unknown): v is OrthogroupDiffPayload { ... }
```

validation 실패 시 sentry/콘솔 로그 + `{ kind: 'error' }` 상태 반환. 혼합 스키마에서 조용히 깨지지 않도록.

### 7. Table pagination

- 50개/페이지 고정
- 상태: `page: number` (0-indexed), 정렬 선택지 (p-value asc / |Δmean| desc / |log2FC| desc)
- sorting은 `payload.entries` 전체에 적용 후 slice
- `null log2FoldChange`는 정렬에서 마지막으로
- representative 없는 행도 정상 렌더 (현재 동작 유지)
- URL: `?trait=X&og=Y&page=N&sort=p` — 공유 가능. og가 있으면 해당 og가 포함된 page로 auto-jump
- 페이지 전환 시 선택된 og 해제 안 함 (drawer 상태 유지)

### 8. Drawer lookup

```typescript
const diffEntry = entriesState.kind === 'ready'
  ? entriesState.payload.entries.find((e) => e.orthogroup === ogId)
  : entriesState.kind === 'legacy'
  ? entriesState.entries.find((e) => e.orthogroup === ogId)
  : undefined;
```

entries 로딩 중엔 drawer가 skeleton을 유지하도록 로딩 상태 전파.

### 9. Storage rules

```
match /orthogroup_diffs/{path=**} {
  allow read: if true;
  allow write: if false;
}
```

디렉터리 매치 — 향후 shard/variant 파일 추가 시에도 깨지지 않음.

### 10. Legacy compatibility

- 새 백엔드 배포 + TSV 재업로드까지는 기존 `top[]` 문서가 남아있음
- 프런트는 `storagePath` 우선, 없으면 `top[]` legacy fallback
- 모든 trait이 recompute 완료된 시점 확인 후 legacy 경로 제거 (별도 PR)

## Affected files

**Backend (Python):**
- `functions-python/orthofinder/diff.py` — `MAX_CANDIDATES` 제거, payload/metadata 분리 반환
- `functions-python/orthofinder/models.py` — `OrthogroupDiffDocument`에서 `top` 제거, `OrthogroupDiffPayload` 추가, `storagePath`/`schemaVersion`/`entryCount` 필드 추가
- `functions-python/orthofinder/orchestrator.py` — Storage 업로드 → Firestore write 순서 강제
- `functions-python/orthofinder/uploader.py` — `upload_json(path, data)` 헬퍼 (이미 있으면 재사용)

**Storage rules:**
- `storage.rules` — `/orthogroup_diffs/{path=**}` 블록 추가

**Frontend (TS):**
- `src/types/orthogroup.ts` — `OrthogroupDiffDocument`에서 `top` 제거, `OrthogroupDiffPayload`/`storagePath`/`schemaVersion`/`entryCount` 추가, `EntriesState` 타입 추가
- `src/lib/orthogroup-service.ts` — `fetchOrthogroupDiffPayload(storagePath)` 추가, `storagePath` 캐시, shape guard
- `src/hooks/useOrthogroupDiffEntries.ts` (신규) — doc → entriesState 매핑 (legacy/ready/loading/error)
- `src/components/explore/OrthogroupDiffTable.tsx` — `OrthogroupDiffPayload` 받아서 pagination + sorting
- `src/components/explore/OrthogroupDiffPagination.tsx` (신규) — 50/page + Prev/Next + 페이지 번호
- `src/components/explore/OgDrawer.tsx` — entries source 변경, 로딩 스켈레톤 전파
- `src/pages/ExplorePage.tsx` — URL에 `page`/`sort` 반영

## Tasks (ordered)

1. [ ] Backend: models.py 타입 분리 + diff.py cap 제거 + orchestrator write 순서
2. [ ] Backend: unit test (metadata/payload 쌍 일관성, fallback에서 entryCount != passedCount)
3. [ ] storage.rules 업데이트
4. [ ] Frontend: 타입 + service fetch + shape guard + legacy fallback
5. [ ] Frontend: useOrthogroupDiffEntries 훅
6. [ ] Frontend: OrthogroupDiffTable pagination + sorting
7. [ ] Frontend: URL 파라미터 (page/sort) + drawer 로딩 전파
8. [ ] 실측: 최대 passedCount trait의 payload 크기/로드 시간 측정 후 문서화 (QC 섹션)
9. [ ] External verification (script-review mode) after implementation

## QC — 구현 후 측정

- Largest trait payload size (bytes)
- Entries 수 vs passedCount 일치
- First-load latency (signed URL + fetch) on dev
- onSnapshot 메타 update + 이전 payload 혼선 시나리오 재현

## Rollback plan

Frontend 배포 후 문제 발생 시:
1. Storage rules 유지 (읽기만 허용이라 해가 없음)
2. Firestore 문서에 `storagePath` 없는 구 문서가 있으면 legacy fallback으로 자동 대응
3. 긴급 롤백: 이전 프런트 버전 재배포 → 구 백엔드가 쓴 `top[]` 읽기로 복귀 (백엔드 배포 전이라면 자연스럽게 원복)

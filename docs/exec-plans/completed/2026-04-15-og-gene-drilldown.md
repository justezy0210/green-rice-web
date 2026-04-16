# [PLAN] Orthogroup → Gene Drilldown

> Codex review round 1: `NEEDS REVISION` (4+5+6 issues). Round 2 closed 12/15.
> Codex review round 2: `NEEDS REVISION` with 6 new issues + 3 partially-closed items. Round 3 (this doc) addresses all of them; no more rounds planned per memory policy.

## Goal

사용자가 `/explore`의 Candidate Orthogroups 테이블에서 OG row를 클릭하면 **drawer가 오른쪽에서 슬라이드 인**하여 그 orthogroup의 상세 정보를 제공한다:

- 품종별 gene list + copy count
- 그룹(early/late 등) summary
- baegilmi gene GFF3 위치 + annotation
- 다른 품종은 gene ID만 (향후 GFF3 업로드로 확장 가능)

OG 단위 diff 결과를 **사람이 읽을 수 있는 유전자 수준**으로 변환.

## Scope (확정)

- **Drawer UI** (page 전환 없이 /explore 위에 겹쳐서 열림)
- **Shareable URL contract: `?trait=<traitId>&og=<ogId>` (둘 다 필수)** — `?og=` 단독은 미지원
- 품종별 GFF3는 **baegilmi만** (나머지는 향후)

## Key Decisions (Codex 피드백 반영)

| 결정 | 선택 | 이유 |
|------|------|------|
| URL contract | `?trait=<traitId>&og=<ogId>` (둘 다 필수) | group/diff context 없으면 drawer 의미 상실. trait 변경 시 drawer 닫음. |
| Gene members 저장 방식 | **Chunked JSON**: `orthofinder/v{N}/og-members/chunk_{XXX}.json` (OG number / 1000 기준, ~54 파일) | 20MB 단일 파일 대비 체감 지연/메인스레드 정지 최소화. 클릭마다 해당 청크만 fetch (~300-500KB) |
| Annotation SSOT | **Versioned derived artifact**: `orthofinder/v{N}/baegilmi_gene_annotation.json` | backend representative와 frontend drawer가 동일 snapshot 참조. live GFF3 직접 읽기 제거. |
| GFF3 재업로드 반영 | Admin이 orthofinder TSV 재업로드로 재계산 트리거 (수동). 내부적으로는 annotation artifact + diff 모두 재생성. | 자동 트리거 복잡도 대비 단순성 선택. `docs/generated/orthofinder-artifacts.md`에 명시 |
| Public version source | **`OrthogroupDiffDocument.orthofinderVersion`**만 사용 | 일반 사용자는 `_orthofinder_meta/state` 읽기 불가 |
| Client cache structure | `Map<orthofinderVersion, Promise<ChunkData>>` per chunk | 버전 바뀌면 자동 무효화 |
| Cultivar name map 소스 | `useCultivars()` hook (신규 호출) | `/explore`가 현재 cultivars를 구독하지 않음. Phase D에서 추가 |
| "Upload GFF3" CTA | **admin에게만 표시** (`useAdminClaim` 훅 기반 조건부) | 비관리자 오도 방지 |
| Drawer 접근성 | focus trap, initial focus, focus restore, body scroll lock, `role="dialog"`, `aria-modal` | WCAG 기본 요구사항 |
| Drawer 파일 분할 | `OgDrawer.tsx`, `OgDrawerHeader.tsx`, `OgDrawerGroupSummary.tsx`, `OgDrawerCultivarSection.tsx` | 300줄 제한 준수 |
| Python mirror 정책 | `AllOgMembersData` TS only (Python은 write만, consume 안 함) | drift 위험 최소화 명시 |
| 문서 배치 | `docs/generated/orthofinder-artifacts.md` 신설 (Storage 산출물 카탈로그) | db-schema.md(Firestore 전용)와 경계 분리 |
| `trait` 변경 시 drawer | **닫음** (group context 변경되므로 무의미) | URL에서 `og` param 제거 |
| Direct URL 접근 | diff doc 로드 완료 전: skeleton. 로드 후 정상 렌더. og가 top[]에 없으면 representative/group summary 생략하고 members만 표시 | |
| Show more state | `Record<cultivarId, boolean>` 단일 객체로 관리 | 품종당 별도 state 난잡해지는 것 방지 |
| 테스트 | parser/chunker에 pytest fixture 추가 | regression 방지 |
| Orphan cleanup 시점 | **`mark_committed` 이전까지**만 cleanup. 이후 diff 단계 실패는 `status='error' + errorMessage`만 기록하고 파일 보존 | round 2 #2: committed 상태와 파일 삭제 불일치 방지 |
| Storage rules | `orthofinder/v{version}/{path=**}` 재귀 매치 | round 2 #1: chunk 하위 디렉토리 403 방지 |
| Client cache 구조 | `Map<version, Data>` (resolved only) + `Map<version+chunk, AbortController>` (in-flight). reject/abort 시 cache eviction | round 2 #3: reject된 promise가 캐시에 남아 영구 실패하는 것 방지 |
| Chunking 방식 | **Streaming chunk writer**: 파서가 row 단위로 yield → chunker가 1000 OG 버퍼 채워지면 즉시 Storage flush + buffer reset | round 2 #4: 전체 TSV in-memory 로드로 인한 Functions OOM 방지 |
| Row click a11y | `<tr>`가 아닌 **첫 셀 내부의 실제 `<button>`**. direct URL 진입 시 focus target 없으면 `document.body`로 fallback | round 2 #5 + round 1 접근성 부분 해소 완결 |
| TS-only 타입 배치 | **`src/types/orthogroup-artifacts.ts` 신설** (TS-only, Python mirror 없음). 기존 `orthogroup.ts`는 mirror 선언 유지 | round 2 #6 + round 1 mirror drift 해소 완결 |

## Approach

### Phase A: Backend — chunked gene members + versioned annotation

**A1. `parser.py`에 streaming row iterator 추가**

```python
def iter_orthogroups_rows(tsv_text: str) -> Iterator[tuple[str, dict[str, list[str]]]]:
    """
    Yield (og_id, {cultivarId: [gene_ids]}) one row at a time.
    Caller is responsible for batching/writing to avoid holding the whole file.
    """
```

**A2. `chunker.py` 신설 — streaming chunk writer**

```python
class StreamingChunkWriter:
    """
    Buffers up to CHUNK_SIZE rows per chunk key, flushes to Storage when full.
    Memory-bounded regardless of input size.
    """
    CHUNK_SIZE = 1000

    def __init__(self, version: int, uploader_module):
        self.version = version
        self.uploader = uploader_module
        self._buffers: dict[str, dict[str, dict]] = {}  # chunk_key → { og_id: {cid: [genes]} }

    def add(self, og_id: str, members: dict[str, list[str]]) -> None:
        chunk_key = self._chunk_key(og_id)
        buf = self._buffers.setdefault(chunk_key, {})
        buf[og_id] = members
        if len(buf) >= self.CHUNK_SIZE:
            self._flush(chunk_key)

    def flush_all(self) -> int:
        keys = list(self._buffers.keys())
        for k in keys:
            self._flush(k)
        return len(keys)

    def _flush(self, chunk_key: str) -> None:
        data = {"chunk": chunk_key, "ogs": self._buffers[chunk_key]}
        self.uploader.upload_json(
            f"orthofinder/v{self.version}/og-members/chunk_{chunk_key}.json",
            data,
        )
        self._buffers[chunk_key] = {}

    @staticmethod
    def _chunk_key(og_id: str) -> str:
        """OG0012345 → '012' (first 3 digits after 'OG', treating as decimal / 1000)."""
        import re
        m = re.match(r"^OG(\d+)$", og_id)
        if not m:
            raise ValueError(f"Invalid og id: {og_id}")
        return f"{int(m.group(1)) // 1000:03d}"
```

**A3. `callable.py` 확장 — 스트리밍 chunking + annotation snapshot + cleanup 순서 재정비**

```python
# 현재 순서 (cleanup 안전):
# 1. 파일 업로드 from staging → v{N}/
# 2. _matrix.json 저장
# 3. baegilmi_og_members.json 저장
# 4. NEW: Orthogroups.tsv를 스트리밍하며 og-members/chunk_*.json 순차 flush
# 5. NEW: baegilmi_gene_annotation.json 저장 (live GFF3 read + write)
# 6. ✓ mark_committed — 이 시점까지의 실패는 orphan cleanup 대상
# 7. recompute_all_diffs — 여기서 실패는 cleanup 없이 status=error만 기록
#
# cleanup policy:
#   - try 블록 step 1-5 내부 예외: finally에서 uploader.delete_version_dir(version)
#   - mark_committed 이후 예외: of_state.set_status("error", errorMessage=...) only (파일 유지)

writer = StreamingChunkWriter(version, uploader)
for og_id, members in iter_orthogroups_rows(genes_text):
    writer.add(og_id, members)
n_chunks = writer.flush_all()
logging.info(f"Wrote {n_chunks} og-members chunks for v{version}")

# GFF3 snapshot (live read once at commit time, then write artifact)
from .gene_annotation import load_baegilmi_gene_annotation
gene_annotation = load_baegilmi_gene_annotation()
uploader.upload_json(
    f"orthofinder/v{version}/baegilmi_gene_annotation.json",
    gene_annotation,
)
```

**A4. `uploader.py`에 `delete_version_dir(version)` 추가**

Storage prefix `orthofinder/v{version}/` 하위 모든 blob 일괄 삭제. 실패해도 로그만 남기고 raise 안 함 (cleanup best-effort).

**A5. `gene_annotation.py` 리팩토링 — artifact 읽기로 전환**

```python
def load_annotation_for_version(version: int) -> dict:
    """Load from orthofinder/v{N}/baegilmi_gene_annotation.json (versioned artifact)."""
    path = f"orthofinder/v{version}/baegilmi_gene_annotation.json"
    return uploader.download_json(path)

# 기존 load_baegilmi_gene_annotation()은 artifact 생성 단계(callable.py)에서만 호출
```

**A6. `orchestrator.py` 수정** — `load_annotation_for_version(active_version)` 사용
→ representative 생성 시점이 drawer가 볼 artifact와 정확히 같은 snapshot 참조

**A7. Orphan cleanup policy (revised)**

```python
# 위 A3의 pipeline 단계 1-5에서 실패한 경우에만 cleanup:
try:
    # steps 1-5: upload, matrix, baegilmi-only, chunks, annotation
    ...
    # step 6: mark_committed(version, ...)   ← 여기부터는 public에 활성화됨
    of_state.mark_committed(db, version=version, ...)
    committed = True
    # step 7: recompute_all_diffs (실패 시 파일 보존, status=error)
    recompute_all_diffs(db, grouping_version)
    of_state.set_status(db, "complete")
except Exception as e:
    logging.exception(f"Orthofinder processing failed: {e}")
    if not committed:
        try:
            uploader.delete_version_dir(version)
        except Exception:
            logging.exception("Orphan cleanup failed (best-effort)")
    of_state.set_status(db, "error", error_message=str(e))
    raise
finally:
    of_lock.release_lock(db, version)
```

`uploader.py`에 `delete_version_dir(version)` 헬퍼 추가 (best-effort, raise 안 함).

### Phase B: Frontend — chunked fetch with versioned cache

**B1. `src/types/orthogroup-artifacts.ts` 신설 (TS-only, no Python mirror)**

기존 `orthogroup.ts`는 파일 헤더에 "Python mirror" 선언이 있어 섞으면 계약 충돌. 별도 파일로 분리.

```typescript
/**
 * TS-only types for Storage artifacts (functions write these; frontend reads).
 * NOT mirrored in Python. Functions use their own structures.
 */

export interface OgMembersChunk {
  chunk: string;         // "000", "001", ...
  ogs: Record<string, Record<string, string[]>>;  // ogId → cultivarId → gene[]
}

export interface BaegilmiGeneInfo {
  chromosome: string;
  start: number;
  end: number;
  strand: '+' | '-' | '.';
  attributes: Record<string, string>;
}

export interface BaegilmiGeneAnnotation {
  genes: Record<string, BaegilmiGeneInfo>;
  transcript_to_gene: Record<string, string>;
}
```

**B2. `src/lib/orthogroup-service.ts` 확장**

**핵심 수정**: Promise를 캐시하지 않음. resolved data만 캐시. in-flight 요청은 AbortController로 별도 트래킹 + reject/abort 시 eviction.

```typescript
// Resolved data cache — keyed by `v${N}:${chunk}` for chunks, by version for annotation
const _chunkData = new Map<string, OgMembersChunk>();
const _annotationData = new Map<number, BaegilmiGeneAnnotation>();

// In-flight request tracking — allows cancellation
const _inflight = new Map<string, AbortController>();

export function chunkKeyForOg(ogId: string): string {
  const match = ogId.match(/^OG(\d+)$/);
  if (!match) throw new Error(`Invalid og id: ${ogId}`);
  return (Math.floor(parseInt(match[1], 10) / 1000)).toString().padStart(3, '0');
}

export async function fetchOgChunk(
  version: number,
  chunkKey: string,
  signal?: AbortSignal,
): Promise<OgMembersChunk> {
  const cacheKey = `v${version}:${chunkKey}`;
  const cached = _chunkData.get(cacheKey);
  if (cached) return cached;

  // Abort any existing in-flight for same key (supersede)
  _inflight.get(cacheKey)?.abort();
  const controller = new AbortController();
  _inflight.set(cacheKey, controller);
  const combinedSignal = mergeAbortSignals(signal, controller.signal);

  try {
    const url = await getDownloadURL(ref(storage, `orthofinder/v${version}/og-members/chunk_${chunkKey}.json`));
    const res = await fetch(url, { signal: combinedSignal });
    if (res.status === 404) throw new NotFoundError(`chunk ${chunkKey} missing`);
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    const data = (await res.json()) as OgMembersChunk;
    _chunkData.set(cacheKey, data);  // cache ONLY after resolved
    return data;
  } finally {
    // Whether success, abort, or error: clear in-flight tracking
    if (_inflight.get(cacheKey) === controller) {
      _inflight.delete(cacheKey);
    }
  }
}

// Same pattern for annotation
export async function fetchBaegilmiAnnotation(
  version: number,
  signal?: AbortSignal,
): Promise<BaegilmiGeneAnnotation> { /* ... */ }

// Error classes
export class NotFoundError extends Error {}
```

Storage fetch via Firebase SDK `getDownloadURL` + `fetch` with AbortController.
`mergeAbortSignals` helper: returns a signal that aborts when either input aborts.

**B3. `src/hooks/useOgDrilldown.ts` — drawer용 통합 훅**

```typescript
interface UseOgDrilldownResult {
  members: Record<string, string[]> | null;          // cultivarId → gene[]
  annotation: BaegilmiGeneAnnotation | null;
  loading: boolean;
  error: string | null;
}

export function useOgDrilldown(
  ogId: string | null,
  orthofinderVersion: number | null,
): UseOgDrilldownResult
```

- ogId/version 중 하나라도 null이면 idle
- chunk + annotation을 병렬 fetch, AbortController로 이전 요청 취소

### Phase C: Drawer UI with accessibility

**C1. `src/components/explore/OgDrawer.tsx` (entry, 최상위 컴포넌트)**

- `fixed right-0 top-0 h-full w-full sm:w-[520px] z-50`
- `translate-x-full` ↔ `translate-x-0` 토글 (Tailwind transition)
- 오버레이 `bg-black/30` 클릭 시 닫힘
- **접근성**:
  - `role="dialog" aria-modal="true" aria-labelledby="og-drawer-title"`
  - ESC 키 처리
  - Focus trap (inside drawer only; Tab/Shift+Tab 순환)
  - Open 시 initial focus = close 버튼
  - Close 시 focus restore: 열 때 저장해둔 trigger element로. **direct URL 진입으로 trigger가 없으면 `document.body`로 fallback**
  - Open 시 `document.body.style.overflow = 'hidden'` (scroll lock), close 시 복원
- 파일 크기 ≤300줄 위해 sub-컴포넌트 4개로 분할:
  - `OgDrawerHeader.tsx` (OG id, close button)
  - `OgDrawerGroupSummary.tsx` (그룹별 mean/sum/presence)
  - `OgDrawerCultivarSection.tsx` (품종별 gene 리스트)
  - `OgDrawerSkeleton.tsx` (로딩 상태)

**C2. `OgDrawerCultivarSection.tsx` 세부**

- Props: `cultivarId`, `cultivarName`, `geneIds`, `copyCount`, `groupLabel`, `groupColor`, `annotation?: BaegilmiGeneAnnotation`, `expanded: boolean`, `onToggleExpand: () => void`, `showUploadCta: boolean` (admin only)
- baegilmi gene: location (`chr01:1,234,567-1,236,890`) + primary attribute
- 다른 품종 gene: gene ID only
- 긴 리스트 처리: 최대 20개 기본, `onToggleExpand`로 전체 보기

**C3. Show more state**

`OgDrawer.tsx`에서 단일 `useState<Record<string, boolean>>` 로 관리:
```typescript
const [expanded, setExpanded] = useState<Record<string, boolean>>({});
// key = cultivarId
```

### Phase D: Explore integration

**D1. `ExplorePage.tsx` 수정**

- 추가: `useCultivars()` 호출 → `cultivarNameMap = Object.fromEntries(cultivars.map(c => [c.id, c.name]))`
- URL params 양쪽 처리:
  ```typescript
  const [params, setParams] = useSearchParams();
  const traitId = isTraitId(params.get('trait')) ? params.get('trait') : null;
  const ogId = traitId ? params.get('og') : null;  // og requires trait
  ```
- `traitId` 변경 시 og param 제거 (drawer 닫기)
- `<OgDrawer ogId={ogId} onClose={...} traitId={traitId} ...>` 마운트

**D2. `OrthogroupDiffTable.tsx`**

- 첫 셀(orthogroup id)을 **실제 `<button>`** 으로 변경 (row 전체 `<tr role="button">`이 아님 — 스크린리더/키보드 의미론 어색함)
- `<button onClick={() => onSelectOg(entry.orthogroup)} className="hover:underline text-left font-mono">`
- ExplorePage에서 `onSelectOg = (og) => setParams(prev => { prev.set('og', og); return prev; })`
- Row hover 시 해당 row 강조는 CSS `hover:bg-gray-50` 유지 (시각적 힌트)
- 파일 크기 확인: button 추가만으로 영향 미미

**D3. Direct URL 접근 시 skeleton**

- diff doc 로딩 중 → `OgDrawer`는 skeleton 상태
- diff doc 로드 후: og가 `top[]`에 있으면 representative/group summary 표시. 없으면 그 섹션 생략하고 members만 표시 (diff 밖 OG도 drilldown 가능)

### Phase E: Docs & tests

**E1. 새 문서 `docs/generated/orthofinder-artifacts.md`**

Storage에 쓰이는 모든 산출물 카탈로그:

```
orthofinder/v{N}/
├── Orthogroups.GeneCount.tsv       # raw
├── Orthogroups.tsv                 # raw
├── _matrix.json                    # parsed matrix
├── baegilmi_og_members.json        # baegilmi-only (representative lookup용)
├── baegilmi_gene_annotation.json   # NEW: GFF3 snapshot
└── og-members/
    ├── chunk_000.json              # OG0000000-OG0000999
    ├── chunk_001.json              # OG0001000-OG0001999
    └── ...
```

**E2. pytest fixture 기반 테스트 (`functions-python/tests/test_parser.py` 신설)**

- fixture: 작은 mock TSV (5 OG × 3 cultivar)
- assertions: parse_orthogroups_tsv_all 결과 구조, chunk_og_members 경계 조건 (정확히 1000 단위 분할, og_number % 1000 == 0 포함)

**E3. 업로드 실패 복구 테스트**
- orphan cleanup 동작 확인

## Files to create

```
functions-python/orthofinder/chunker.py             # StreamingChunkWriter
functions-python/tests/__init__.py
functions-python/tests/test_parser.py
functions-python/tests/test_chunker.py

src/types/orthogroup-artifacts.ts                   # TS-only types (no Python mirror)
src/hooks/useOgDrilldown.ts
src/components/explore/OgDrawer.tsx
src/components/explore/OgDrawerHeader.tsx
src/components/explore/OgDrawerGroupSummary.tsx
src/components/explore/OgDrawerCultivarSection.tsx
src/components/explore/OgDrawerSkeleton.tsx

docs/generated/orthofinder-artifacts.md
```

## Files to modify

```
functions-python/orthofinder/parser.py        # add iter_orthogroups_rows (streaming)
functions-python/orthofinder/callable.py      # streaming chunk + annotation snapshot; cleanup only pre-commit
functions-python/orthofinder/gene_annotation.py # add load_annotation_for_version (artifact read)
functions-python/orthofinder/orchestrator.py  # use versioned annotation artifact
functions-python/orthofinder/uploader.py      # delete_version_dir (best-effort)

storage.rules                                 # allow orthofinder/v{version}/{path=**} recursive public read
src/lib/orthogroup-service.ts                 # chunk/annotation fetch with AbortController + resolved-data cache
src/pages/ExplorePage.tsx                     # useCultivars, URL param, drawer mount
src/components/explore/OrthogroupDiffTable.tsx # first-cell <button> for accessibility
```

## Storage rules change

```
// BEFORE: matches single file only, breaks og-members/chunk_XXX.json
match /orthofinder/v{version}/{file} {
  allow read: if true;
  allow write: if false;
}

// AFTER: recursive match for nested paths
match /orthofinder/v{version}/{path=**} {
  allow read: if true;
  allow write: if false;
}
```

## Risks / Open questions (축소)

1. **chunk_{XXX}.json 평균 크기 실측 필요**: 53k OG / 54 chunk ≈ 1k OG per chunk. 한 OG ≈ 평균 150 bytes (gene ID 리스트) → 약 150KB/chunk. Verification 단계에서 실측.
2. **AbortController 지원**: Firebase Storage SDK의 `getDownloadURL` 자체는 abort 불가. 대신 `fetch(downloadURL, { signal })` 단계에서 abort. 에러 분류: `AbortError` → 무시, 나머지는 사용자에게 전달.
3. **baegilmi GFF3 업로드 후 기존 orthofinder 결과 재계산 필요성**: admin에게 재업로드 권고. UI hint (admin only): "GFF3가 변경되었습니다. OrthoFinder 결과를 재업로드하여 annotation을 갱신하세요."

## Implementation Order

1. Phase A (backend) → 재배포 → Storage에 chunk/annotation artifact 생성 확인
2. Phase B (service + hook) → unit 수준 테스트
3. Phase C (drawer UI) → 접근성 포함
4. Phase D (integration) → URL 공유 테스트
5. Phase E (docs + tests) → 마무리

## Verification

- [x] Plan round 1 → Codex → NEEDS REVISION (4+5+6)
- [x] Plan round 2 → Codex → NEEDS REVISION (6 new + 3 partially-closed); this doc is round 3 reflecting all of them
- [ ] Phase A: Storage에 chunk_000.json, baegilmi_gene_annotation.json 생성 + 크기 로그
- [ ] Phase A: Functions 메모리 사용량 확인 (스트리밍 덕분에 피크 낮아야 함)
- [ ] Phase A: pytest fixture 통과 (parser + chunker)
- [ ] Phase A: pre-commit 실패 → v{N}/ orphan cleanup 동작. post-commit 실패 → 파일 보존 + status=error
- [ ] Storage rules 배포: recursive public read 확인
- [ ] Phase B: chunk 캐시 동작 (reject/abort 시 eviction)
- [ ] Phase B: 연속 chunk 요청 시 이전 AbortController 취소 동작
- [ ] Phase C: drawer 키보드/focus/scroll lock 수동 검증 (ESC, Tab trap, focus restore)
- [ ] Phase D: `?trait=&og=` 직접 URL 접근 → drawer 정상, focus body fallback
- [ ] Phase D: `?trait=` 변경 시 drawer 자동 닫힘
- [ ] Phase D: first-cell `<button>` 키보드 Enter/Space 동작
- [ ] `npm run check:arch` + `npm run build` 통과
- [ ] 실제 재업로드 후 /explore drilldown 동작

## Non-Goals

- 품종별 GFF3 업로드 (추후)
- InterProScan/KEGG annotation (추후)
- Pangenome graph 연결 (2순위: PAV/SV hotspot)
- Gene phylogeny, alignment viewer
- Allele frequency drilldown

# [PLAN] Feature 1 — Orthogroup Differential Analysis

> Codex review: 1회 검증 후 10개 이슈 일괄 반영 (self-trigger, 권한, 스냅샷 일관성, atomic upload 등)

## Goal

OrthoFinder 결과(`Orthogroups.GeneCount.tsv`, `Orthogroups.tsv`)를 업로드하고, 각 phenotype trait의 auto-grouping 결과와 조인하여 **그룹 간 copy number 차이가 큰 top candidate orthogroups**를 자동으로 산출·표시한다.

Feature 1 (phenotype-driven exploration)의 첫 단계로, "조생종과 만생종을 가르는 후보 유전자는?"에 대한 초기 후보를 orthogroup 단위로 제시.

## Context

- OrthoFinder 파일 보유 확인:
  - `data/Orthogroups.GeneCount.tsv` (1.8MB, 53,330 rows, 11 cultivar columns)
  - `data/Orthogroups.tsv` (9.8MB, 53,330 rows, gene ID lists per cultivar)
- 컬럼 형식: `{cultivarId}_longest`, suffix 제거 시 Firestore `cultivars/` 문서 ID와 정확히 일치 (11/11 확인됨)
- 기존 grouping 파이프라인은 k=2로 고정. 이 플랜도 **2그룹 전제**로 진행하되 스키마는 N그룹 확장 가능하게 남김.
- 기존 admin 라우트(`/admin`)는 로그인만 요구하고 role 체크 없음 → 이 플랜에서 role 기반 권한 도입.

## Key Decisions

| 결정 항목 | 선택 | 이유 |
|----------|------|------|
| Matrix 저장 | Storage에 JSON (version별 디렉토리), Firestore에는 diff 결과 + meta만 | 크기/비용 |
| 파이프라인 위치 | `functions-python/` | Python stats/numpy 활용 |
| Diff 지표 | Mean diff, Presence diff, Log2 fold change | 직관+통계 병기 |
| Diff 저장 범위 | trait별 top 50 | UI 로딩 최적화 |
| Borderline 품종 | 평균 계산에서 제외 | auto-grouping과 일관 |
| Unusable trait | diff 문서 생성 안 함 | 혼동 방지 |
| **트리거 방식** | **HTTPS Callable function** (`startOrthofinderProcessing`) + grouping 함수 내부 후처리 | self-retrigger 완전 차단 |
| **Admin 역할 검증** | Firebase custom claim (`auth.token.admin === true`) | 로그인만으로는 TSV 재계산 트리거 못 함 |
| **업로드 원자성** | `orthofinder/staging/{uploadId}/...`에 두 파일 업로드 후 callable로 commit | 반쪽 버전 방지 |
| **버전 스냅샷** | Grouping + orthofinder 각자 version을 diff 문서에 기록, UI는 현재 version과 비교 | 소비자 측에서 stale 감지 |
| **일관성 보장** | Orthofinder diff 계산은 **grouping function의 락 내부**에서 실행 | 단일 critical section |
| **그룹 수** | 초기 k=2 전제. 스키마는 `meansByGroup: Record<string, number>`로 N그룹 지원 | 향후 확장 |
| **재계산 범위** | **전체 trait 재계산** (변경된 trait만 아님) | 현재 grouping도 전체 재계산. 복잡도 절감 |

## Approach

### Phase A: Types

**A1. Frontend types** (`src/types/orthogroup.ts`)

```typescript
export interface OrthogroupDiffEntry {
  orthogroup: string;
  meansByGroup: Record<string, number>;      // e.g. { "early": 1.2, "late": 3.8 }
  presenceByGroup: Record<string, number>;   // fraction with copy >= 1
  cultivarCountsByGroup: Record<string, number>;
  meanDiff: number;                          // max - min across groups
  presenceDiff: number;
  log2FoldChange: number | null;             // only meaningful for exactly 2 groups; null otherwise
  representative?: {
    source: 'baegilmi_gff3';                 // TEMPORARY — replace with proper functional annotation later
    geneId: string;
    chromosome: string;
    start: number;
    end: number;
    strand: '+' | '-' | '.';
    attributes: Record<string, string>;      // raw GFF3 col-9 (Note, product, Description, Ontology_term, ...)
  };
}

export interface OrthogroupDiffDocument {
  traitId: string;
  groupLabels: string[];                     // order matches group indexScore ascending
  top: OrthogroupDiffEntry[];                // sorted by meanDiff desc, max 50
  computedAt: string;
  groupingVersion: number;                   // from _grouping_meta/lock.version at compute time
  orthofinderVersion: number;                // from _orthofinder_meta/state.activeVersion at compute time
}

export interface OrthofinderState {
  // Processing status (visible to subscribers)
  status: 'idle' | 'uploading' | 'processing' | 'complete' | 'error';
  errorMessage?: string;

  // Active committed version
  activeVersion: number;                     // 0 until first upload commits
  activeVersionUploadedAt: string | null;

  // Manifest of the active version
  totalOrthogroups: number;
  cultivarIds: string[];
  geneCountPath: string;                     // "orthofinder/v{N}/Orthogroups.GeneCount.tsv"
  genesPath: string;                         // "orthofinder/v{N}/Orthogroups.tsv"
  matrixJsonPath: string;                    // "orthofinder/v{N}/_matrix.json" (derived)
}

export interface OrthofinderLock {
  status: 'idle' | 'running';
  leaseExpiresAt: string | null;
  version: number;                           // monotonic across all runs
}
```

**A2. Python dataclass mirror** (`functions-python/orthofinder/models.py`)

### Phase B: Upload Flow (atomic)

**B1. Client upload**
- User picks 2 files in admin UI
- Client generates `uploadId = crypto.randomUUID()`
- Uploads both to `orthofinder/staging/{uploadId}/Orthogroups.GeneCount.tsv` and `.../Orthogroups.tsv`
- On success, calls HTTPS callable `startOrthofinderProcessing({ uploadId })`
- **No Firestore write from client to trigger processing.** All orchestration via callable.

**B2. Callable function** (`functions-python/main.py`)
- Verify `request.auth.token.admin === true` (custom claim); else throw `permission-denied`
- Verify both files exist in staging
- Acquire orthofinder lock (lease-based, same pattern as grouping)
- Increment `_orthofinder_meta/state.activeVersion` → N
- **Atomic commit**: move files from `staging/{uploadId}/` to `orthofinder/v{N}/`
- Update `_orthofinder_meta/state`: `status='processing'`, write new paths
- Proceed to parse + diff (Phase C, D)
- On completion: `status='complete'`. On error: `status='error', errorMessage=...`
- Release lock

### Phase C: Parse + Diff Computation (`functions-python/orthofinder/`)

**C1. Parser** (`parser.py`)
- Read `Orthogroups.GeneCount.tsv` from Storage
- Strip `_longest` suffix from column headers
- Cross-check cultivar IDs against Firestore `cultivars/` (log mismatches, use intersection)
- Write normalized JSON to `orthofinder/v{N}/_matrix.json`:
  ```json
  {
    "version": N,
    "cultivarIds": [...],
    "totalOrthogroups": 53330,
    "ogs": { "OG0000000": { "baegilmi": 21, ... }, ... }
  }
  ```

**C2. Orthogroups.tsv parser** — extract **baegilmi gene lists per OG** (smaller extract written to same dir)
- Don't load full 10MB into memory per diff run; pre-extract baegilmi-only column to `baegilmi_og_members.json`

**C3. Gene annotation (TEMPORARY)** (`gene_annotation.py`)
- Download `genomes/baegilmi/gene.gff3` from Storage
- Parse `gene` and `mRNA` rows
- Build `transcript_id → gene_id` map (via `Parent=`)
- Build `gene_id → { chromosome, start, end, strand, attributes }` (attributes = all GFF3 col-9 key=value except ID/Parent)
- OrthoFinder uses transcript IDs like `baegilmi_g1234.t1` → resolve via transcript map, fall back to stripping `.t\d+$`

**C4. Diff computation** (`diff.py`) — per trait
1. Load grouping doc, partition non-borderline cultivars by group
2. For each OG in matrix:
   - `meansByGroup[g] = mean(counts in g)` (skip if group has 0 members for this OG)
   - `presenceByGroup[g] = n(counts ≥ 1) / n_in_g`
   - `meanDiff = max(means) − min(means)`
   - `presenceDiff = max(presence) − min(presence)`
   - `log2FoldChange`: only if exactly 2 groups AND both means > 0
3. Sort by (`meanDiff` desc, `presenceDiff` desc), top 50
4. Attach `representative` using baegilmi_og_members + gene_annotation (skip if OG has no baegilmi gene)
5. Write `orthogroup_diffs/{traitId}` with `groupingVersion`, `orthofinderVersion`, `groupLabels`

**C5. Skip conditions (no doc written)**
- `summary.method === 'none'` (unusable trait)
- Fewer than 2 groups with members (e.g. all borderline, or all one class)

### Phase D: Integration with Grouping Pipeline

**D1. Modify `on_cultivar_change`** (`functions-python/main.py`)

Current flow: trigger → acquire grouping lock → run grouping → write `groupings/` → release.

New flow appends an **orthofinder diff step inside the same lock**:
1. Run grouping (existing logic)
2. If `_orthofinder_meta/state.activeVersion > 0`:
   - Load matrix from Storage
   - Load baegilmi gene annotation (cache with LRU or per-invocation)
   - For each trait just written, compute diff → write `orthogroup_diffs/{traitId}`
3. Release grouping lock

**Why inside same lock**: guarantees `groupingVersion` in diff matches the just-written `summary.version`, eliminating race with concurrent runs.

**D2. Modify `startOrthofinderProcessing` callable**

1. Acquire orthofinder lock + grouping lock (in that order, release in reverse)
2. Parse + commit new version
3. Recompute diffs for **all** traits using current groupings
4. Release locks

### Phase E: Admin UI

**E1. Prereq: custom claims**
- Manual or script-based: grant `admin` claim to specific users. Document steps in `docs/SECURITY.md`.
- For MVP: a `scripts/grant-admin.cjs` helper that calls `admin.auth().setCustomUserClaims(uid, { admin: true })` — to be run manually by owner.
- `ProtectedRoute` / admin-only UI: check `auth.currentUser.getIdTokenResult().claims.admin`

**E2. Upload service** (`src/lib/orthofinder-service.ts`)
```typescript
export async function uploadOrthofinderFiles(
  geneCountFile: File,
  genesFile: File,
  onProgress: (phase: 'uploading' | 'processing', percent: number) => void,
): Promise<void>
```
- Generate uploadId
- Parallel upload to staging
- Call `startOrthofinderProcessing` via `httpsCallable`
- Subscribe to `_orthofinder_meta/state` until `status === 'complete' | 'error'`

**E3. Hook** (`src/hooks/useOrthofinderStatus.ts`)
- Subscribe to `_orthofinder_meta/state`
- Return `{ state, loading }`
- Only subscribers with `admin` claim read successfully; others get null

**E4. Admin panel** (`src/components/admin/OrthofinderUploadPanel.tsx`)
- Placement: AdminPage top-level (not per-cultivar). Add a tab/section split at admin root.
- Two file inputs, upload button, status badges, last-commit info (version, N cultivars, totalOrthogroups)
- Disabled if user is not admin (with explanatory tooltip)

### Phase F: ExplorePage (new dedicated page at `/explore`)

**F1. Service** (`src/lib/orthogroup-service.ts`)
- `subscribeOrthogroupDiff(traitId): Unsubscribe`
- `getOrthofinderMatrix(): Promise<MatrixData>` (on-demand, cached in singleton)
- `subscribeOrthofinderState(cb): Unsubscribe` — for stale-version banner (public-safe fields only, read is admin-only at rules level so requires fallback)

**F2. Hook** (`src/hooks/useOrthogroupDiff.ts`)
- Subscribe diff for given `traitId`
- Subscribe grouping doc (for version/quality context)
- Return `{ doc, groupingDoc, isStale, loading }` where `isStale` = `doc.groupingVersion !== groupingDoc.summary.version`

**F3. Page** (`src/pages/ExplorePage.tsx`)
- **Top**: trait selector (all 9 traits, disabled state for unusable ones)
- Grouping summary card: group labels + cultivar counts per group + borderline count + method badge (GMM/fixed-class)
- OrthogroupDiffTable section
- Stale banner if `isStale`
- Empty states:
  - No trait selected → "Select a phenotype trait to explore candidate orthogroups"
  - Unusable trait → "This trait is not groupable ({quality.note})"
  - No orthogroup data yet → "Upload OrthoFinder results in the admin panel"
- URL param `?trait=heading_date|culm_length|...` (uses `TraitId` directly, not field key)

**F4. Components** (`src/components/explore/`)
- `TraitSelector.tsx` — dropdown with groupable/unusable visual distinction
- `GroupingSummaryCard.tsx` — shows labels, counts, method, scoreValue
- `OrthogroupDiffTable.tsx` — dynamic group columns, top 20 (expand to 50)
  - Columns: orthogroup | mean per group (1 col each) | diff | presence diff | log2 FC | representative
  - `representative` renders `chr:start-end` + primary attribute popover (Note / product / Description first found)
  - Column header tooltip: "Representative gene from baegilmi GFF3 (temporary)"

**F5. Routing + Navigation**
- `src/App.tsx` — add `<Route path="/explore" element={<ExplorePage />} />`
- `src/components/layout/Header.tsx` — add nav item `{ path: '/explore', label: 'Explore' }`
- Dashboard (`src/pages/DashboardPage.tsx`) — add a compact "Explore candidate orthogroups →" link/button next to the search (no widget in dashboard body)

## Firestore Schema

```
orthogroup_diffs/
└── {traitId}                       # OrthogroupDiffDocument

_orthofinder_meta/
├── state                           # OrthofinderState — subscribed by admin UI
└── lock                            # OrthofinderLock — functions-only
```

**Rules:**
```
match /orthogroup_diffs/{traitId} {
  allow read: if true;
  allow write: if false;            // functions only
}
match /_orthofinder_meta/state {
  allow read: if request.auth != null && request.auth.token.admin == true;
  allow write: if false;            // functions only
}
match /_orthofinder_meta/lock {
  allow read, write: if false;
}
```

## Storage Layout

```
storage/
└── orthofinder/
    ├── staging/{uploadId}/
    │   ├── Orthogroups.GeneCount.tsv
    │   └── Orthogroups.tsv
    └── v{N}/                       # committed versions, immutable
        ├── Orthogroups.GeneCount.tsv
        ├── Orthogroups.tsv
        ├── _matrix.json            # normalized
        └── baegilmi_og_members.json
```

**Storage rules:**
```
match /orthofinder/staging/{uploadId}/{file} {
  allow read: if request.auth != null && request.auth.token.admin == true;
  allow write: if request.auth != null && request.auth.token.admin == true;
}
match /orthofinder/v{version}/{file} {
  allow read: if true;              // public matrix/genes for drilldown
  allow write: if false;            // functions only (via admin SDK)
}
```

## Files to create

```
functions-python/orthofinder/
├── __init__.py
├── models.py
├── parser.py
├── uploader.py                     # staging → committed version move
├── gene_annotation.py              # baegilmi GFF3 extractor (temporary)
└── diff.py

scripts/grant-admin.cjs             # manual admin claim helper

src/types/orthogroup.ts
src/lib/orthofinder-service.ts
src/lib/orthogroup-service.ts
src/hooks/useOrthofinderStatus.ts
src/hooks/useOrthogroupDiff.ts
src/components/admin/OrthofinderUploadPanel.tsx
src/pages/ExplorePage.tsx
src/components/explore/TraitSelector.tsx
src/components/explore/GroupingSummaryCard.tsx
src/components/explore/OrthogroupDiffTable.tsx
```

## Files to modify

- `functions-python/main.py` — add `startOrthofinderProcessing` callable; extend `on_cultivar_change` with post-grouping diff step
- `functions-python/requirements.txt` — no new deps (numpy/sklearn already present)
- `firestore.rules` — add `orthogroup_diffs/` + `_orthofinder_meta/*` rules
- `storage.rules` — add `orthofinder/**` rules with admin claim check
- `src/components/auth/ProtectedRoute.tsx` — optional `requireAdmin` flag
- `src/pages/AdminPage.tsx` — add OrthofinderUploadPanel (admin-only section)
- `src/App.tsx` — add `/explore` route
- `src/components/layout/Header.tsx` — add "Explore" nav item
- `src/pages/DashboardPage.tsx` — add "Explore candidates →" link (no widget embed)
- `docs/generated/db-schema.md` — add new collections
- `docs/SECURITY.md` — document admin claim grant procedure

## Risks / Open questions

1. **Baegilmi GFF3 dependency (temporary)**: representative annotation requires `genomes/baegilmi/gene.gff3`. Missing → `representative` omitted, diff still works. Flagged in types and UI. To be replaced with proper functional annotation (InterProScan/KEGG) later.
2. **Transcript vs gene ID**: OrthoFinder uses transcript IDs (`baegilmi_g1234.t1`); GFF3 `gene` rows use gene IDs. Parser builds transcript→gene map via `Parent=`.
3. **Matrix load latency**: ~3MB JSON fetched on demand for drilldown. Cache in singleton.
4. **Cultivar ID drift**: rename breaks matrix-column ↔ Firestore ID match. Validate at parse, log mismatches. Version bump on re-upload fixes it.
5. **Admin claim bootstrap**: initial admin must be granted via CLI script (no UI). Documented in SECURITY.md.
6. **Grouping lock contention**: every cultivar edit now does grouping + diff within a single lock. Diff adds ~1-2s. Still well within 300s timeout for 11 cultivars × 53k OGs.
7. **Scale to 16+ cultivars**: OrthoFinder often includes all assembled cultivars, not yet uploaded ones. Accept intersection (use only the cultivars present in both matrix and Firestore). Warn in UI.
8. **>2 groups (future)**: schema supports N groups. UI renders dynamic columns. `log2FoldChange` only populated for k=2.

## Implementation Order

1. Phase A: Types (TS + Python)
2. Phase B: Upload flow + callable (no processing yet, just move files)
3. Phase C: Parse + diff core logic (unit tests with mock matrix)
4. Phase D: Integrate into `on_cultivar_change` + callable finishes diff
5. Phase E: Admin UI (requires admin claim script first)
6. Phase F: Dashboard widget

## Verification

- [x] Plan → Codex (round 1, 10 issues found) → 전체 반영 (round 2 생략, 구현 시 해결)
- [ ] Phase A: TS/Python schema parity
- [ ] Phase B: emulator — upload staging + commit moves files to `v{N}/`
- [ ] Phase B: emulator — non-admin user gets `permission-denied` from callable
- [ ] Phase C: unit tests — known matrix + known grouping → expected top diffs
- [ ] Phase C: edge cases — unusable trait, single-group, all-borderline, missing baegilmi GFF3
- [ ] Phase C: transcript ID (`.t1`) resolves to gene ID
- [ ] Phase D: emulator — cultivar edit triggers grouping + diff within same lock
- [ ] Phase D: emulator — diff `groupingVersion` matches `groupings/{traitId}.summary.version`
- [ ] Phase E: admin claim granted → upload UI works; without claim → disabled with tooltip
- [ ] Phase F: `/explore` route loads, trait selector shows groupable/unusable distinction
- [ ] Phase F: OrthogroupDiffTable shows top 20 with dynamic group columns
- [ ] Phase F: `isStale` banner appears when grouping version changes after diff was computed
- [ ] Phase F: Dashboard has compact "Explore candidates →" link, no widget embed
- [ ] `npm run check:arch` passes (TS + Python)

# [PLAN] Auto-Grouping Pipeline

> Status: DONE (2026-04-15)
> Codex review: APPROVED

## Result
- Phase A-F 전체 구현 완료
- `tsc --noEmit` + `check:arch` 통과
- Python Cloud Function 배포 명령: `firebase deploy --only functions:grouping`
- 실배포 후 확인 필요: emulator 트리거 테스트, ComparisonPage auto 모드 UI 검증

## Goal

품종이 추가/편집될 때 trait별 자동 그룹핑을 수행하는 Cloud Function(Python) 파이프라인 구현.
결과를 Firestore에 저장하고, 프론트엔드 Comparison 페이지에서 활용할 수 있도록 한다.

## Context

- 현재 ComparisonPage에서 사용자가 수동으로 threshold를 조정해 그룹을 나누고 있음
- idea.md에 GMM 기반 자동 그룹핑 파이프라인이 상세 설계되어 있음
- Cloud Functions에는 이미 genome parsing 파이프라인(Node.js)이 구현되어 있음
- **Cloud Functions 2nd gen은 Python GA** — scikit-learn `GaussianMixture` 사용
- 현재 품종 수: 11개 (16개 목표)
- **현재 heading_date SSOT는 3개 환경(early/normal/late)**. idea.md와 type-definitions.md의 5개 환경은 구 설계이며 현재 코드와 불일치. 구현은 현재 코드 기준으로 진행하고, 문서는 Phase A에서 정리.

## Scope Constraints (초기 범위 제한)

- **2-group only** — 현재 `TopDifferencesTable`이 groups[0] vs groups[1] 하드코딩. k=3 UI 개편 전까지 k=2만 사용.
- **BLB는 resistant/susceptible 2-class** — K1-K3a 조합 16-class가 아닌, ≥1 resistant / 0 susceptible 단순 분류.
- **k=3, multi-class는 후속 Phase로** — UI 컴포넌트 개편 후 활성화.

## Key Decisions

| Issue | Decision |
|-------|----------|
| Types canonical | `src/types/grouping.ts`가 canonical. Python은 자체 dataclass (언어 차이로 자동 공유 불가, 스키마 수동 동기화) |
| Multi-env input | 3-env 평균 → **단변량 통합 점수**로 축소 |
| GMM engine | **Python Cloud Function** + scikit-learn |
| Trigger scope | phenotype-only hash 비교. `genomeSummary`, `crossInformation` 변경은 무시. 삭제 이벤트도 재계산 트리거 |
| Grouping 결과 저장 | `groupings/` 컬렉션만 사용. `cultivars/`에 **절대 기록 안 함** |
| BLB null | admin form 기본값이 all-false이므로 null 케이스는 사실상 불가. all-false = susceptible로 분류. 혹시 null이면 assignment 미생성 |
| assignment key | key=cultivarId. value에 cultivar 필드 없음 (중복 방지) |
| cultivarId→name 조인 | adapter에서 `cultivarNameMap` 인자로 받아 변환. 기존 UI name 기반 호환 |
| Confidence data | hook이 `comparisonGroups`와 별도로 `assignments` 원본도 반환 → ConfidenceBadge 렌더링 가능 |
| traitId mapping | `src/types/grouping.ts`에 `FIELD_TO_TRAIT_ID` 매핑 테이블 (UI camelCase ↔ grouping snake_case) |
| Firestore rules | `groupings/` 공개 읽기 추가 |
| Lock mechanism | `leaseExpiresAt` 만료 기반 lock. 크래시 시 고착 방지 |
| Rerun strategy | bounded loop (max 3) + hash 안정화 |
| Python function settings | region=asia-northeast3, memory=1GiB, timeout=300s (scikit-learn import 포함) |
| Python secret check | `codex-verify.sh`에서 Python 파일도 읽도록 확장. `check:arch`에 Python secret scan 추가 |
| Unusable trait policy | `method: 'none'` (새 union 값). summary+quality 저장, assignments 빈 객체 |
| stale records | hook에서 grouping 변경 감지 시 `usePhenotypeData` 캐시 무효화 트리거 or 안내 메시지 |
| codex-verify.sh 디렉토리 | 디렉토리 인자 시 내부 파일 자동 확장하도록 스크립트 수정 |
| 문서 정합성 | Phase A에서 type-definitions.md, idea.md의 5-env 참조를 3-env로 업데이트 |

## Approach

### Phase A: Types, Metadata & Document Fixes

**A1. Frontend 타입** (`src/types/grouping.ts`) — canonical source

```typescript
export interface TraitMetadata {
  traitId: string;
  type: 'multi-env' | 'single-continuous' | 'binary';
  keys: string[];
  direction: 'higher-is-more' | 'higher-is-less' | 'not-applicable';  // binary용
  labels: { low: string; high: string };
  unit: string;
}

export interface GroupingSummary {
  traitId: string;
  method: 'gmm' | 'fixed-class' | 'none';  // none = unusable trait
  nGroups: number;                            // 0 for unusable
  scoreMetric: 'silhouette' | 'bic' | 'none';
  scoreValue: number;
  version: number;                            // number, not string (_meta.version과 일치)
  updatedAt: string;
}

// Key is cultivarId in the assignments map
export interface CultivarGroupAssignment {
  groupLabel: string;
  probability: number;
  confidence: 'high' | 'medium' | 'borderline';
  borderline: boolean;
  indexScore: number;
}

export interface TraitQuality {
  traitId: string;
  nObserved: number;
  nUsedInModel: number;
  missingRate: number;
  usable: boolean;
  note: string;
}

// Firestore groupings/{traitId} 문서 구조
export interface GroupingDocument {
  summary: GroupingSummary;
  quality: TraitQuality;
  assignments: Record<string, CultivarGroupAssignment>;  // key = cultivarId
}

// UI field key (camelCase) → grouping traitId (snake_case) 매핑
export const FIELD_TO_TRAIT_ID: Record<string, string> = {
  early: 'heading_date',
  normal: 'heading_date',
  late: 'heading_date',
  culmLength: 'culm_length',
  panicleLength: 'panicle_length',
  panicleNumber: 'panicle_number',
  spikeletsPerPanicle: 'spikelets_per_panicle',
  ripeningRate: 'ripening_rate',
  grainWeight1000: 'grain_weight',
  preHarvestSprouting: 'pre_harvest_sprouting',
  bacterialLeafBlight: 'bacterial_leaf_blight',
};
```

**A2. Python 타입** (`functions-python/grouping/models.py`) — dataclass mirror of A1

**A3. Trait metadata** (`functions-python/grouping/trait_metadata.py`)

| traitId | type | keys | direction | labels |
|---------|------|------|-----------|--------|
| heading_date | multi-env | [early, normal, late] | higher-is-more | early / late |
| culm_length | single-continuous | [culmLength] | higher-is-more | short / tall |
| panicle_length | single-continuous | [panicleLength] | higher-is-more | short / long |
| panicle_number | single-continuous | [panicleNumber] | higher-is-more | low / high |
| spikelets_per_panicle | single-continuous | [spikeletsPerPanicle] | higher-is-more | low / high |
| ripening_rate | single-continuous | [ripeningRate] | higher-is-more | low / high |
| grain_weight | single-continuous | [grainWeight1000] | higher-is-more | light / heavy |
| pre_harvest_sprouting | single-continuous | [preHarvestSprouting] | higher-is-more | low / high |
| bacterial_leaf_blight | binary | [k1, k2, k3, k3a] | not-applicable | resistant / susceptible |

**A4. Document fixes**
- `docs/design-docs/type-definitions.md`: 5-env heading date → 3-env로 수정. "현재 SSOT는 코드 기준 3-env" 명시
- `docs/product-specs/idea.md`: idea는 유지하되, 현재 구현 기준은 3-env임을 주석 추가

### Phase B: Python Grouping Engine (`functions-python/grouping/`)

두 갈래: **GMM** (continuous) + **Fixed-class** (binary)

**B1. quality_check.py**
- n_observed < 6 → usable=false
- missing_rate > 40% → usable=false
- near-zero variance → usable=false
- `nUsedInModel`: GMM에 실제 입력된 row 수

**B2. preprocess.py**
- Multi-env (heading_date): 3개 환경 중 존재하는 값의 **평균 → 단변량 스칼라**. 전부 null이면 제외.
- Single-continuous: null 제외
- Z-score normalization
- Output: 1D numpy array + nUsedInModel

**B3. gmm_cluster.py** — continuous only, **k=2 only** (초기 범위)
- `GaussianMixture(n_components=2)`
- Output: labels, probabilities, BIC

**B4. fixed_class.py** — binary only
- BLB: `resistance.bacterialLeafBlight` 데이터로 분류
  - detail 있으면: any(k1,k2,k3,k3a)==true → resistant, else susceptible
  - detail 없으면: `bacterialLeafBlight >= 1` → resistant, `== 0` → susceptible
  - all-false (admin default) → susceptible (probability=1.0, confidence='high')
  - null → assignment 미생성 (사실상 발생 안 함)
- Output: CultivarGroupAssignment (probability=1.0, confidence='high')

**B5. optimizer.py** — 현재는 k=2 고정이므로 단순. silhouette_score 계산만.

**B6. post_process.py**
- Borderline: prob >= 0.85 → high, 0.65-0.85 → medium, < 0.65 → borderline
- Auto-naming: trait direction + group means

**B7. orchestrator.py**
- Read all cultivar docs
- Route: continuous → quality_check → preprocess → gmm → post_process
- Route: binary → fixed_class
- Unusable → summary.method='none', nGroups=0, assignments={}
- Write to `groupings/`

### Phase C: Firestore Schema & Rules

**New collection: `groupings/`**

```
groupings/
├── _meta: {
│     status: 'idle' | 'running',
│     leaseExpiresAt: string | null,   ← 만료 시각 기반 lock
│     completedAt: string,
│     version: number,
│     phenotypeHash: string
│   }
└── {traitId}: GroupingDocument
```

**Firestore rules 수정** (`firestore.rules`):

```
match /groupings/{docId} {
  allow read: if true;
  allow write: if false;  // Cloud Functions만 기록 (admin SDK 우회)
}
```

### Phase D: Cloud Function Trigger

**D1. Python Cloud Function** (`functions-python/main.py`)

```python
@on_document_written("cultivars/{cultivarId}")
def on_cultivar_change(event):
    # ...
```

Settings: `region="asia-northeast3"`, `memory=1024`, `timeout_sec=300`

기존 Node.js function과 동일 region (asia-northeast3) 사용.

**D2. Phenotype-only 변경 감지**

```python
PHENOTYPE_KEYS = ['daysToHeading', 'morphology', 'yield', 'quality', 'resistance']
# crossInformation 제외 (표시용 메타데이터, 그룹 계산 무관)
# genomeSummary 제외 (genome pipeline 상호 자극 방지)

def should_trigger(before: dict | None, after: dict | None) -> bool:
    if before is None or after is None:  # create or delete
        return True
    for key in PHENOTYPE_KEYS:
        if before.get(key) != after.get(key):
            return True
    return False
```

**D3. Lease-based lock** (`groupings/_meta`)

```python
LEASE_DURATION = timedelta(minutes=10)
MAX_RETRIES = 3

# 1. Transaction: read _meta
#    - status='running' AND leaseExpiresAt > now → skip
#    - status='running' AND leaseExpiresAt <= now → lease expired, take over
#    - status='idle' → acquire
# 2. Set status='running', leaseExpiresAt=now+10min
# 3. Run grouping
# 4. Compute current phenotypeHash
# 5. If hash changed during run → retry (max 3)
# 6. Set status='idle', version++, clear leaseExpiresAt
```

### Phase E: Frontend Integration

**E0. ComparisonPage 상태 모델 리팩토링** (사전 작업)

현재 `ComparisonPage`는 `groupByField`를 받지 않고 버리고 있음. 먼저 상태를 정리:

```typescript
// ComparisonPage 새 상태 모델
const [groupingMode, setGroupingMode] = useState<'manual' | 'auto'>('manual');
const [groupByField, setGroupByField] = useState('early');
const [manualGroups, setManualGroups] = useState<ComparisonGroup[]>([]);
// auto 모드 시 useGroupings에서 가져옴
const groups = groupingMode === 'auto' ? autoGroups : manualGroups;
```

- `GroupConfigPanel.onGroupsChange` 콜백에서 `groupByField` 2nd arg 수신하도록 수정
- `usePhenotypeData`에 `invalidateCache()` 공개 API 추가 (stale data 대응)
- `usePhenotypeData`가 cultivarId도 함께 제공하도록 확장 → `useGroupings`에서 별도 `useCultivars()` 호출 제거

**E1. Service** (`src/lib/grouping-service.ts`)

```typescript
export function subscribeGrouping(traitId: string, cb: (doc: GroupingDocument | null) => void): Unsubscribe

export function assignmentsToComparisonGroups(
  assignments: Record<string, CultivarGroupAssignment>,
  cultivarNameMap: Record<string, string>,
  options?: { includeBorderline?: boolean }
): ComparisonGroup[]
```

- 1-group 결과 정책: groups.length < 2이면 빈 배열 반환 + quality.note에 "All cultivars in same group" 기록

**E2. Hook** (`src/hooks/useGroupings.ts`)

```typescript
interface UseGroupingsResult {
  comparisonGroups: ComparisonGroup[];
  assignments: Record<string, CultivarGroupAssignment>;
  summary: GroupingSummary | null;
  quality: TraitQuality | null;
  loading: boolean;
}
```

- nameMap은 ComparisonPage에서 받은 records로 구성 (추가 Firestore read 없음)

**E3. Components**
- `AutoGroupToggle.tsx` — manual/auto 전환
- `ConfidenceBadge.tsx` — `TopDifferencesTable`을 확장하여 cultivar 옆에 badge 렌더링. `assignments` prop 추가.
- `GroupDistributionChartWrapper.tsx` — `components/charts/`에 배치 (wrapper 패턴)

**E4. ComparisonPage integration**
- `groupingMode` 상태에 따라 manual/auto 분기
- auto 모드: `FIELD_TO_TRAIT_ID[groupByField]` → `useGroupings(traitId)` → groups 주입
- stale data: grouping cultivarId가 현재 records에 없으면 skip + 경고 배너
- `invalidateCache()` 호출 → 새로고침 유도

### Phase F: Tool Fixes (검증 도구 개선)

**F1. `codex-verify.sh` 디렉토리 지원**
- code 모드에서 인자가 디렉토리이면 내부 파일을 자동 확장 (find + glob)

**F2. `check-architecture.ts` Python 시크릿 스캔**
- `functions-python/` 하위 `.py` 파일도 시크릿 패턴 스캔 대상에 추가

## Unusable Trait Policy

| Field | Value |
|-------|-------|
| summary.method | `'none'` |
| summary.nGroups | `0` |
| summary.scoreValue | `0` |
| quality.usable | `false` |
| quality.note | reason string |
| assignments | `{}` (empty) |

Frontend: `quality.usable === false` → "Grouping not available: {quality.note}" 표시

## Files to create

```
functions-python/
├── main.py
├── requirements.txt              ← firebase-functions, firebase-admin, scikit-learn, numpy
└── grouping/
    ├── __init__.py
    ├── models.py
    ├── trait_metadata.py
    ├── quality_check.py
    ├── preprocess.py
    ├── gmm_cluster.py
    ├── fixed_class.py
    ├── optimizer.py
    ├── post_process.py
    └── orchestrator.py

src/types/grouping.ts
src/lib/grouping-service.ts
src/hooks/useGroupings.ts
src/components/comparison/AutoGroupToggle.tsx
src/components/comparison/ConfidenceBadge.tsx
src/components/charts/GroupDistributionChartWrapper.tsx
```

## Files to modify

- `firebase.json` — add Python codebase with region/memory/timeout
- `firestore.rules` — add `groupings/` public read
- `src/pages/ComparisonPage.tsx` — auto-group integration, stale data handling
- `src/components/comparison/GroupConfigPanel.tsx` — AutoGroupToggle 연동
- `scripts/codex-verify.sh` — directory support for code mode
- `scripts/check-architecture.ts` — Python secret scanning
- `docs/design-docs/type-definitions.md` — 3-env heading date 정리
- `docs/generated/db-schema.md` — groupings collection 추가

## Implementation Details (구현 시 해결)

구현 단계에서 반드시 처리할 디테일. 계획 수준에서는 방향만 결정, 코드에서 확정.

1. **hash 계산**: cultivarId 알파벳 정렬 후 phenotype 필드만 JSON.stringify → SHA-256. 순서 고정으로 동일 데이터 = 동일 해시 보장.
2. **_meta 분리**: `groupings/_meta` 대신 `_grouping_meta/lock` 별도 컬렉션. Firestore rules에서 trait 문서만 public read, lock 문서는 deny.
3. **version 원자성**: orchestrator가 batch write로 모든 trait 문서 + lock 문서를 단일 batch에 기록. `summary.version`과 lock `version`은 같은 batch에서 동일 값.
4. **retry 3회 초과/예외 시**: finally 블록에서 반드시 status='idle', leaseExpiresAt=null로 정리. 실패해도 lock 해제 보장.
5. **firebase.json predeploy**: Python codebase는 `predeploy` 없이 추가 (Python은 빌드 불필요). Node codebase의 predeploy는 그대로 유지.
6. **Python region/memory/timeout**: `firebase.json`이 아닌 Python 코드 내 데코레이터에서 설정 (기존 Node와 동일 패턴).
7. **BLB null 처리**: `boolean | null` 타입이므로 null을 정상 케이스로 처리. null이면 해당 품종 BLB assignment 미생성. pytest에 null 케이스 포함.
8. **1-group 결과**: fixed-class에서 전원 susceptible → groups.length=1 → ComparisonPage에 "All cultivars in same group" 표시, 비교 UI 숨김.
9. **FIELD_TO_TRAIT_ID 드리프트 방지**: `PhenotypeFieldKey` union 타입을 `src/types/phenotype.ts`에 정의, `FIELD_TO_TRAIT_ID`의 key 타입으로 사용.
10. **codex-verify.sh**: 디렉토리 인자 시 `find "$dir" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.py" \)` 로 확장.
11. **check-architecture.ts**: `functions-python/` 하위 `.py` 파일에 대해 secret scan + 파일 크기 체크 추가. Python lint는 별도 `ruff` 또는 `flake8` 도입 검토.
12. **usePhenotypeData 확장**: 반환값에 `cultivarId` 포함하도록 `data-service.ts` 수정. `invalidateCache()` 메서드 추가.

## Risks / Open questions

1. **Python cold start** — scikit-learn import로 2-3초. 낮은 빈도 트리거이므로 수용.
2. **Sample size** — 11 cultivars, k=2 only. 모든 결과에 sample size 경고 표시.
3. **TS↔Python 동기화** — 스키마 변경 시 양쪽 수동. Verification 체크리스트에 포함.
4. **Rerun loop** — bounded max 3 + leaseExpiresAt로 이중 방지.
5. **stale records** — grouping 최신 vs phenotype records 캐시 불일치. 경고 배너로 대응, 새로고침 유도.

## Implementation Order

1. A1-A4: Types + metadata + document fixes
2. B1-B7: Python grouping engine 전체
3. C: Firestore schema + rules
4. D1-D3: Trigger + lock
5. F1-F2: Tool fixes (codex-verify directory, Python secret scan)
6. E1-E4: Frontend (service → hook → components → page)

## Verification

- [x] Plan → `./scripts/codex-verify.sh plan` (이 문서)
- [ ] Phase A → `./scripts/codex-verify.sh code src/types/grouping.ts`
- [ ] Phase B → `./scripts/codex-verify.sh code functions-python/grouping/*.py` (F1 적용 후)
- [ ] Phase B: pytest — known 1D data, BLB classification, unusable trait
- [ ] Phase C → Firestore rules 검증 (emulator)
- [ ] Phase D → emulator: phenotype 변경만 트리거, genomeSummary/crossInfo 변경 무시, delete 트리거
- [ ] Phase E → `npm run check:arch` + `./scripts/codex-verify.sh code src/lib/grouping-service.ts src/hooks/useGroupings.ts`
- [ ] Phase F → `./scripts/codex-verify.sh code scripts/codex-verify.sh scripts/check-architecture.ts`
- [ ] 전체 → `./scripts/codex-verify.sh arch`
- [ ] TS/Python 타입 동기화 확인 (A1 vs A2 diff)
- [ ] ComparisonPage auto-grouping + ConfidenceBadge + stale data 경고 동작 확인

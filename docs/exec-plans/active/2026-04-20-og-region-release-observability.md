# [PLAN] og_region v2 release observability — runtime error states + release invariants (rev2)

## Goal

og_region v2 포인터 기반 atomic release의 운영 가시성을 다음 두 계층에서 올린다. 세 번째 계층(pointer/af-manifest 로더)은 이번 범위 밖으로 명시한다.

1. **런타임 훅 (per-cluster 데이터)**: `useOgRegionAf` / `useOgRegionGraph`의 평탄한 `data: null` 실패 모델을 상태 전이 모델로 바꾼다 — `idle | loading | ok | missing | unavailable`.
2. **릴리스 인프라 (promote + release note)**: `scripts/promote-og-region.py`에 "소스 리스트 없이도 검사 가능한" invariant 프리플라이트를 추가하고, `docs/releases/og-region-template.md`에 판정 알고리즘과 필드별 출처를 명시한다.

**이번 플랜 범위 밖 (알려진 잔여 blind spot)**:
- `useOgRegionPointer`의 `error: string | null`은 유지 (앱 부트 1회성 로더).
- `useOgRegionAfManifest`는 여전히 `manifest: null, loading: false`로 모든 실패를 합친다. 포인터가 가리키는 per-trait manifest가 404인 경우가 조용히 묻힐 수 있음. 이 잔여 silent path는 Release B 플랜에서 다루기로 이월.

## Context

2026-04-20 `verify general-review` 결과 P1 2건. 오늘 `plan-review` (rev1)에서 `needs revision` 판정:
- promote invariant가 기존 validator보다 얕음 — validator와의 역할 분리가 불분명.
- release decision 필드에 판정 알고리즘 없음 — 사람마다 임의 기입 가능.
- 훅 상태 전이 명세 부재 — `idle → loading → missing` 이외 경로(key 전환 중 이전 상태 잔존) 구현 편차 위험.
- "dry-run" 용어 오남용 (실제론 fail-fast negative-case 테스트).
- Generation id = overwrite 식별자지 content identity 아님.

본 rev2는 위 피드백을 반영.

**현재 실행 중인 extractor 배치(PID 1984216, ~675/4067)의 결과물에는 영향 없음** — 다음 promote 이전에 머지되어야 효과 발생. 구현 완료까지 extractor가 끝나지 않으면 이번 릴리스에 바로 적용, 끝나면 plan 머지를 먼저.

## State transition table — runtime hooks

`useOgRegionAf` / `useOgRegionGraph` 공통 계약:

| 입력 / 이벤트 | 결과 상태 (`state.key === currentKey` 유지 시 반환) |
|---|---|
| `key`가 null/빈 문자열 (입력 조건 미충족) | `{ data: null, status: 'idle', loading: false }` |
| `key` 생성 직후 effect 진입 | `{ data: null, status: 'loading', loading: true }` |
| HTTP 200 + JSON parse 성공 | `{ data, status: 'ok', loading: false }` |
| HTTP 404 | `{ data: null, status: 'missing', loading: false }` |
| HTTP 5xx / HTTP 403 / 네트워크 오류 / JSON parse 실패 | `{ data: null, status: 'unavailable', loading: false }` |
| `controller.abort()` (unmount 또는 key 전환) | **상태 변경 없음**. 다음 effect의 `loading` 진입으로 자연스레 덮임 |
| `key`가 다른 값으로 변경 | 새 effect 진입 시 즉시 `loading` 상태 반환 (`state.key !== currentKey`여서 이전 상태가 필터링됨) |

**Stale-response 차단**은 기존 모델 유지 — `setState`는 항상 `{ key, ... }` 형태로 쓰고, 리턴 시 `state.key === currentKey`를 검사해 이전 key의 상태가 새 key로 노출되지 않게 한다.

**Abort 처리 구현 규칙**: 기존의 `.catch(() => setState(...))`에서 setState 호출을 제거. AbortError가 catch로 들어와도 그냥 무시하고, 상태는 다음 effect가 진입할 때 `loading`으로 덮이도록.

## Promote preflight vs validator — role separation

원칙: **promote는 원본 입력(candidate_ogs.txt, fingerprint 소스)에 접근하지 않고도 staging 번들만으로 재검증할 수 있는 invariant**를 실행한다. validator는 소스 참조 검사와 orphan walk 등 원본 필요 검사를 담당한다.

| 검사 | promote preflight | validator (기존) |
|---|---|---|
| `ogsEmitted + ogsSkipped == candidateOgs` (manifest-internal) | ✓ | ✓ |
| `len(gm.ogs) == candidateOgs` | ✓ | ✓ |
| `statusCounts.graph_* 합 == clustersEmitted` | ✓ | ✓ |
| AF summary traits == trait dirs == per-trait manifest keys | ✓ | ✓ |
| pointer `afManifests` key set == 상기 세 집합 | ✓ | (pointer는 promote에서 생성) |
| graph `_manifest.json` 로드 가능성 + `schemaVersion == 2` | ✓ | ✓ |
| `og_region_graph/v{of}_g{g}/` 프리픽스 empty | ✓ (immutability) | — |
| candidate_ogs.txt와 OG 집합 대조 | — | ✓ (소스 참조) |
| orphan file walk (번들 내 존재하나 manifest에 없는 파일) | — | ✓ |
| AF cluster ⊆ graph emitted cluster | — | ✓ |
| input fingerprint 재계산 대조 | — | ✓ |

promote preflight 실패는 SystemExit로 종료 — 업로드 zero. validator를 스킵해도 최소 방어선.

## Release decision algorithm

`docs/releases/og-region-template.md`의 `Status` 필드는 다음 규칙으로만 기입한다:

```
1. promote preflight invariant fail                       → release 문서 미작성 (SystemExit)
2. smoke HEAD 중 하나라도 200 아님                         → blocked
3. validator 또는 smoke에서 발생한 waived known-gap 존재  → pass-with-known-gaps
4. 위 모두 green                                          → pass
```

`blocked`로 판정되면 `Blocking issues` 섹션에 HTTP 코드 + 실패 경로를 기록하고, pointer는 이미 flip된 상태이므로 즉시 rollback 절차를 기록한다. (rollback 절차 자체는 기존 `docs/runbooks/og-region-release.md`에 이월.)

`pass-with-known-gaps`는 validator의 특정 waiver(예: 특정 OG의 LIFT_FAIL가 이미 상위 계획에서 수용됨)만 해당. 임의 서술 waiver 금지.

## Promote stdout 포맷 (release note 수기 복사 대상)

preflight 통과 시 stdout:

```
Preflight invariants:
  candidateOgs=4067 emitted=3980 skipped=87 (sum ok)
  ogs dict length=4067 (ok)
  graph statusCounts sum=8812 clustersEmitted=8812 (ok)
  AF trait dirs=9 summary=9 perTraitManifest=9 (match)
  final prefixes empty: og_region_graph/v6_g4/, og_region_af/v6_g4/

Uploading...
  ...
  manifests uploaded
Pointer flipped → downloads/_og_region_manifest.json
Pointer object generation=1745120123456789  ← overwrite id, not content hash

Post-promote smoke:
  pointer 200 (X bytes)
  graph manifest 200 (Y bytes)
  af manifest [heading_date] 200 (Z bytes)
  sample per-cluster graph 200
  sample per-cluster af 200
Smoke count: 2 manifests + 1 per-trait manifest + 2 per-cluster samples = 5 HEAD 200
```

release note 작성자는 이 블록을 그대로 복사해 해당 섹션에 붙인다. 자동화(`promote --write-note`)는 P3로 이월.

## Release template revision

`docs/releases/og-region-template.md`의 변경 범위:

1. `Smoke log` 섹션 제목 → `Smoke sampling log` (sample 기반임 명시).
2. `Release decision` 섹션 신규 추가:
   ```markdown
   ## Release decision
   - Status: pass | pass-with-known-gaps | blocked  ← 판정 규칙: plan § Release decision algorithm
   - Blocking issues: (blocked인 경우 HTTP 코드 + 실패 경로)
   - Known gaps (waived): (pass-with-known-gaps인 경우 waiver 근거 문서/이슈 링크)
   - Pointer object generation: <숫자>  ← promote stdout의 "Pointer object generation="에서 복사. Overwrite 식별자이며 content hash 아님.
   - Invariants verified at promote time (from stdout):
     - [ ] candidate/emitted/skipped 합계
     - [ ] graph ogs dict length
     - [ ] graph statusCounts 합계
     - [ ] AF trait triple match
     - [ ] final prefixes empty
     - [ ] smoke N HEAD 200
   ```
3. `Notes`는 유지하되 "decision-affecting 정보는 위 섹션에, 자유 서술은 Notes" 규칙을 주석으로 추가.

각 필드 출처는 템플릿 내 inline 주석으로 명시 (`← promote stdout`, `← git rev-parse`, 등).

## Terminology fix

rev1의 "dry-run"은 실제론 손상된 staging으로 실행해 업로드 전 SystemExit를 확인하는 **negative-case preflight test**. 플랜 전반에서 용어 수정. `scripts/promote-og-region.py`에 `--dry-run` 플래그는 **추가하지 않음** — 추가하면 현재 간단한 프리플라이트 구조를 복잡하게 만들 수 있고, 실제 방어는 "빈 프리픽스 + if_generation_match=0"으로 이미 atomic.

## Files to modify

**런타임:**
- `src/types/og-region-v2.ts` — `RegionFetchStatus` 유니온 타입 추가.
- `src/hooks/useOgRegionAf.ts` — 상태 전이 테이블대로 구현.
- `src/hooks/useOgRegionGraph.ts` — 동일.

**릴리스:**
- `scripts/promote-og-region.py` — `_preflight_invariants(graph_manifest_path, af_run)` 함수 추가, `main()`에서 `_assert_empty` 직후 호출. pointer 업로드 후 `blob.reload(); print('Pointer object generation=...', blob.generation)`. 프리플라이트 체크별 stdout 포맷 통일.
- `docs/releases/og-region-template.md` — Release decision 섹션 + 필드 출처 주석 + Smoke 섹션 제목 변경.

**검증 하네스:**
- `scripts/smoke-og-region-hooks.ts` — 신규. fetch를 mock해 5개 전이 시나리오 각각에 대해 훅 상태가 기대치와 일치하는지 확인하는 독립 스크립트. (테스트 러너 없으므로 standalone node script + 체크 통과/실패 stdout 요약.)

## Negative-case preflight fixture

`scripts/test-fixtures/og-region-broken-staging/` (gitignore 아래) 구성안:
- `og_region_graph/run_broken/_manifest.json` — 의도적으로 `totals.ogsEmitted + totals.ogsSkipped != totals.candidateOgs`.
- `og_region_af/run_broken/` — trait dir 하나 제거해서 summary.traits와 mismatch.

검증 커맨드:
```bash
python3 scripts/promote-og-region.py scripts/test-fixtures/og-region-broken-staging
# expected: SystemExit with "Manifest totals inconsistent: ..." 또는 "AF trait mismatch: ..."
# expected: 0 uploads
```

## Risks / Open questions

- **UI 소비자 확장 시점**: Release B에서 `useOgRegion` 레거시 어댑터를 걷어내고 v2 훅 직접 소비로 전환할 때 `status === 'missing'` 분기를 UI에 붙여야 함 (이를테면 "This region is missing under the active release — report to the operator" 배너). 이번 플랜엔 포함 안 함. 상태 전이 테이블이 그 시점의 계약 근거.
- **Firebase public storage의 404/403 판별**: 현재 `storage.rules`가 og_region_graph/** 와 og_region_af/**에 public read 허용. 정책이 어긋나면 403이 섞일 수 있는데, 이때는 `unavailable`로 뭉쳐 판정 — 사용자에겐 동일한 UX, 운영자에겐 storage.rules 감사로 진단. 규칙 변경 시 알림은 별도 CI 루트로 해결(본 플랜 밖).
- **Pointer object generation의 의미**: Google Cloud Storage의 object generation은 "overwrite 식별자"이지 content hash가 아님. 다음 릴리스에 content가 바이트 단위로 동일해도 generation은 증가. 이는 릴리스별 유일성은 보장하지만 "같은 내용을 재배포했는가"의 증거가 될 수 없음 — P3에서 sha256 기록 도입.
- **Validator와의 역할 분리 드리프트**: 새로운 invariant가 추가될 때 promote vs validator 중 어디에 넣을지는 위 역할 분리 표를 기준으로 판단. 소스 리스트 참조 없이 번들만으로 검사 가능하면 promote, 소스 참조 필요하면 validator. 본 플랜 문서를 reference로 `docs/runbooks/og-region-release.md`에서 링크.
- **JS 테스트 러너 부재**: 현재 `package.json`에 vitest/jest 없음. `smoke-og-region-hooks.ts`는 standalone node script로 작성 — `tsx scripts/smoke-og-region-hooks.ts`로 실행, stdout에 각 시나리오 pass/fail 출력 후 하나라도 fail이면 exit 1. 본격 테스트 하네스 도입은 tech-debt.

## Verification

- [ ] `npm run check:all` 통과 (lint + type-check + arch + 시크릿 스캔)
- [ ] `tsx scripts/smoke-og-region-hooks.ts` → 5개 전이 시나리오 모두 pass
- [ ] `python3 scripts/promote-og-region.py scripts/test-fixtures/og-region-broken-staging` → SystemExit (업로드 0건 stdout 확인)
- [ ] `/verify plan-review` 통과 (rev2, 본 문서) — 최대 2회 규칙 내 2회차에 해당
- [ ] `/verify script-review` — 구현 완료 후 런타임 훅 + promote 스크립트 각각
- [ ] 실제 다음 릴리스 promote에서 stdout 포맷이 템플릿과 1:1 매핑되는지 수기 확인

## Result (completed 이동 시 작성)
- Status: TBD
- Notes: TBD

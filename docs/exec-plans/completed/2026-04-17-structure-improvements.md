# Structure Improvements — TODO

Status: active — 2026-04-17
Priority: medium (address when adding synteny pipeline)

## 중기 구조 개편 과제

### 1. Run/Manifest 체계 도입
- 현재: 산출물 종류 중심 (`orthofinder/v{N}/`, `orthogroup_diffs/v{N}/g{M}/`, `og_allele_freq/`)
- 목표: 분석 실행 단위(run) + manifest로 입력/버전/설정 추적
- 구조 예시:
  ```
  analyses/{runId}/manifest.json   ← orthofinderVersion, groupingVersion, cultivarSet, vcfSampleSet, createdAt
  analyses/{runId}/diffs/{trait}.json
  analyses/{runId}/allele_freq/{trait}.json
  analyses/{runId}/categories/og_categories.json
  analyses/{runId}/synteny/...
  ```

### 2. Raw/Derived/Serving 분리
- Raw: 업로드 원본 (TSV, VCF, GFF3, HAL)
- Derived: 분석 산출물 (matrix, grouping, diff, AF, category, synteny)
- Serving: UI 최적화 파일 (baegilmi_gene_annotation.json 등)
- `baegilmi_gene_annotation.json`은 serving → derived와 분리

### 3. 명명 리팩터
- `orthogroup_diffs` → `candidate_og_results` 또는 `og_differential`
- `passedCount` → `passedOgCount`
- `groupings` → 이름은 유지하되 `method: gmm`이 Firestore doc에 있으므로 OK
- `_orthofinder_meta/state` → 역할 명확화 (version pointer + pipeline status 분리)

### 4. Grouping history
- 현재: `groupings/{traitId}` = latest only
- 목표: latest pointer + `runs/` 서브컬렉션으로 과거 결과 재현 가능

## 트리거 시점
- Synteny 파이프라인 추가 시 함께 진행 (HAL extraction + 새 산출물 → run 체계 자연스러운 진입점)
- 단독으로 하면 기존 코드 대규모 리팩터 필요 → synteny와 묶는 게 효율적

## Result

- Status: SUPERSEDED
- Notes: This was a medium-term backlog note, not an active implementation
  plan. The later runId-based analysis module and versioned manifest work
  addressed the highest-value parts. Remaining items should be tracked as
  specific tech-debt entries or new active plans when implementation starts.

# [PLAN] Pangenome viz Phase 1 — signature-collapsed tube map + cultivar matrix + gene track

## Goal

OG Detail의 Pangenome Graph 탭을 **세 개의 독립적 view가 병치된 탐색 화면**으로 재설계한다. Phase 1은 **extractor 변경 없이 현 v2 JSON 데이터만으로 구현 가능한 범위**.

### Scope 원칙 — 세 view 병치, 시각적 정렬 안 함

MVP에서는 Cactus graph를 gene model과 bp 단위로 정렬된 그림으로 보여주지 **않는다**. 정렬하려면 extractor에 node별 reference offset이 필요하고(Phase 3), 근사 정렬은 "정밀한 시각 단서"처럼 잘못 읽힐 위험이 큼. 대신 다음 셋을 **독립적 view로 병치**하여 각자 다른 질문에 답하게 한다:

| View | 답하는 질문 | 좌표계 |
|---|---|---|
| **Anchor gene model track** | "이 region 주변에 어떤 gene이 있나?" | anchor cultivar 유전체 좌표 |
| **Collapsed local tube-map** | "구조적 haplotype은 몇 종류이고 어떻게 다른가?" | graph topology (bp 무관) |
| **Cultivar matrix** | "각 품종이 어떤 상태인가?" | per-row per-cultivar |

사용자는 세 view를 같은 페이지에서 **해석적으로 연결**(graph가 유전자 어디 근처인지는 matrix의 copy/PAV 컬럼으로 유추)하지만, 그래픽이 서로를 정확히 align하지는 않는다.

### 완료 기준

1. 16 cultivar × 최대 3 phase block → client-side에서 **distinct path signature**로 dedup되어 보통 2–5 개 pattern으로 요약 렌더링.
2. Cultivar matrix가 panel 내 각 cultivar의 {group, copy, PAV, **pattern id**}를 표시하고, pattern id로 정렬 가능.
3. Pattern summary strip이 각 pattern의 cultivar 수 + group 분포 + 구조 설명(reference-like / insertion / skip)을 제공.
4. Anchor gene model track이 별도 view로 anchor 유전자 좌표계에 표시됨. Tube map과 bp 정렬하지 않음.
5. 기존 OG Detail의 다른 탭(Gene Locations / Anchor-locus Variants) 변화 없음.

**Phase 1 범위 밖**:
- Node-level 정확 정렬 (extractor에 `node.ref_offset` 필요 → Phase 3)
- Snarl/bubble 메타 (extractor 변경 → Phase 3)
- Variant class coloring (snarl 메타 필요 → Phase 3)
- Gene model exon detail (gene_models cross-ref 는 Phase 2)
- 1D pangenome overview (Codex 권고 — Phase 3 고려)

## Context

### 사용자 피드백 & 결정 흐름

2026-04-21 `/verify` 결과 요약:
- 기존 tube map은 Cactus path-anchored output에 맞는 메타포지만 **40+ path 가독성 한계** + gene overlay 부족 + overview 부재.
- Codex 권고: 1D overview 추가 + tube map detail화 (하이브리드).
- 사용자 역제안: **tube map 유지하되 (a) summary card (b) cultivar matrix (c) path signature collapse**. 반영.
- 최종 합의: **signature collapse가 scope.md 정체성과 정보 밀도 양쪽에서 최선**. Group-representative 방식은 phenotype causal-feeling이 강해서 기각.

### 데이터 가용성

현재 v2 per-cluster JSON (`og_region_graph/v6_g4/{og}/{cluster}.json`):
```ts
interface RegionDataGraph {
  anchor: { cultivar, kind, genes, regionSpan, flankBp },
  liftover: { status, irgspRegion, coverage },
  graph: { nodes, edges, paths } | null,
  ...
}
```

Paths 각각:
```ts
{ name: string, steps: Array<{ nodeId, orientation? }> }
```

Signature 계산에 필요한 모든 것이 `steps` 에 있음. 클라이언트에서 순수 함수로 계산 가능.

### Scope 규율 (scope.md 2026-04-20)

- Pattern 라벨은 **구조적 설명**만 (`ref-like`, `alt_insertion`, `node_skip`). 그룹 이름으로 라벨 금지.
- Group 분포는 pattern의 **하위 annotation**. "observed along with" 언어 사용.
- "이 pattern이 trait를 결정한다" 식 표현 금지.

## Approach

### Part A — Path signature 계산

**신규 파일**: `src/lib/pangenome-path-signature.ts`

```ts
export interface PathSignature {
  hash: string;              // canonical string: "42>->43>alt5<->44"
  nodeSequence: string[];    // ["42", "43", "alt5", "44"]
  orientations: string[];    // ["+", "+", "-", "+"]
}

export interface PathPattern {
  patternId: string;          // "P1", "P2" ...
  signature: PathSignature;
  nodeCount: number;
  cultivarIds: string[];      // unique cultivars in this pattern
  groupCounts: Record<string, number>;  // { early: 3, late: 2 }
  sampleSupport: number;      // total path rows assigned
  structureLabel: string;     // "ref-like" | "alt_insertion" | "node_skip" | "divergent"
  refLikenessScore: number;   // 0–1, how similar to reference path
}

export function computePathSignatures(
  paths: TubeMapPath[],
): Map<string, PathSignature>;

export function groupPathsIntoPatterns(
  paths: TubeMapPath[],
  options: {
    referencePathName?: string;
    groupByCultivar?: Record<string, CultivarGroupAssignment> | null;
    parseCultivar: (pathName: string) => { cultivar: string; isRef: boolean };
  },
): PathPattern[];
```

**Signature canonical form**:
- `steps.map((s, i) => `${s.nodeId}${s.orientation ?? '+'}`).join('>')` 
- Orientation 포함 (같은 노드 다른 방향 = 다른 pattern)
- Phase block별 독립 signature

**Structure label 분류** (reference path와 비교):
- `ref-like`: signature identical 또는 차이 1 node 이하
- `alt_insertion`: reference path의 부분집합 + 중간에 추가 node
- `node_skip`: reference path에서 node 누락 (deletion-like)
- `divergent`: 그 외 복잡한 경우

**refLikenessScore**: `1 - edit_distance(pattern.nodeSequence, ref.nodeSequence) / max_length`

### Part B — Pattern-based TubeMap 렌더링

**수정**: `src/components/og-detail/TubeMapRenderer.tsx`

변경:
- Input: `data: OgTubeMapData` → 내부에서 `groupPathsIntoPatterns()` 호출
- 렌더: paths 전부가 아니라 **pattern별로 한 lane** 렌더
- 각 lane 두께 ∝ `sqrt(cultivarIds.length)` (시각 가중치, 5배 이상 차이 방지)
- Lane 색: pattern id별 고정 (P1=파랑, P2=주황, P3=초록, ...) — phenotype group 색 사용 금지
- Ordering: `refLikenessScore` 내림차순 (reference-like가 위)
- Hover: 그 pattern의 cultivar 리스트 + group 분포 표시

**기존 sort mode 변경**:
- `TubeMapSortMode` 옵션 제거 (`phenotype` / `graph-overlap`). Signature collapse 후엔 의미 없음.
- 대신 "Expand all paths" toggle — pattern collapse 해제하고 원래 개별 cultivar path 표시 (debug / deep-dive).

**신규 파일**: `src/lib/pangenome-pattern-colors.ts`
- Pattern id → 색 매핑. 색맹 친화 팔레트.

### Part C — Pattern summary strip

**신규 컴포넌트**: `src/components/og-detail/PatternSummaryStrip.tsx`

Tube map 위에 가로 strip, 각 pattern을 한 줄로:

```
P1 ━━━ 10 cultivars · early 5 · late 3 · intermediate 2 · reference-like
P2 ━━━ 4 cultivars · late 3 · early 1 · alt_node insertion
P3 ━━━ 2 cultivars · early 1 · intermediate 1 · node skip (deletion-like)
```

- Pattern id에 색 dot (tube map lane과 동일 색)
- Cultivar 수는 크게, group 분포는 작게
- Structure label 우측
- 클릭: 해당 pattern lane만 tube map에 하이라이트

### Part D — Cultivar matrix

**신규 컴포넌트**: `src/components/og-detail/CultivarPatternMatrix.tsx`

Tube map 아래 (또는 우측, 넓은 화면에서) 테이블:

| Cultivar | Heading group | Copy | PAV | Pattern |
|---|---|---|---|---|
| baegilmi | early | 1 | present | ● P1 |
| chamdongjin | early | 1 | present | ● P1 |
| jopyeong | late | 2 | duplicated | ● P2 |
| namchan | intermediate | 0 | absent-pending | ○ missing |

- Pattern 컬럼은 색 dot + pattern id
- 헤더 클릭으로 정렬 (pattern 컬럼 정렬 = 같은 pattern 품종이 뭉침)
- Heading group은 현재 trait context가 있을 때만 표시 (null OK)
- Cultivar row 클릭: matrix row hover + tube map에서 해당 cultivar가 속한 pattern lane 하이라이트

**데이터 조립**:
- `cultivars` from useCultivars
- `members` from useOgDrilldown (gene count → copy)
- `pavRows` (이미 OgDetailPage에서 계산됨)
- `groupByCultivar` (이미 있음)
- `patterns` from Part A — cultivar → pattern id 역인덱스 구축

### Part E — Anchor gene model track (독립 view)

**신규 컴포넌트**: `src/components/og-detail/AnchorGeneTrack.tsx`

Tube map과 **독립적인 view**. 같은 페이지에 병치되지만 시각적 정렬은 하지 않음.

```
┌─ Anchor: baegilmi · chr02:25,650,000-25,670,000 (20 kb) ─┐
│  [gene A]         [gene B]        [candidate OG gene]    │
│  ╰─────╯          ╰─────╯         ╰───────────────╯      │
└──────────────────────────────────────────────────────────┘
```

- Header에 **anchor cultivar 좌표** 명시 — "이 track은 anchor 좌표계"를 사용자가 인지
- Input: `anchor.genes[]` (region 안에 포함된 anchor cultivar의 gene bbox, 이미 extractor에 있음)
- 각 gene을 horizontal rail 위의 rectangle로, gene.start~gene.end를 anchor region 폭에 선형 매핑
- Gene id 라벨 + 길이 (bp)
- Gene rect 클릭 → `/genes/{gene.id}` 이동 (Gene detail 페이지)
- Candidate OG member gene은 시각적으로 강조 (예: 녹색 border)

**Caveat 명시**: "This track shows anchor cultivar coordinates only. It is not aligned bp-for-bp with the pangenome graph below." 툴팁 또는 soft-tone 각주.

**Phase 2에서 exon detail 추가** — `useGeneModel(geneId)`로 가져와 CDS/UTR 분해. Phase 1은 gene bbox만.

### Part F — Summary card 확장

**수정**: `src/pages/OgDetailPage.tsx`

현재 header에 있는 배지/메타에 **graph evidence 태그** 추가:

```
OG0001234
core · 16/16 · 3 multi-copy (×3 max), 13 singleton
anchor tier: representative
PAV: present 14, duplicated 2
Graph: 3 distinct patterns · ref-like dominant (10 cultivars)
```

- "3 distinct patterns" = `patterns.length`
- "ref-like dominant (10 cultivars)" = 가장 많은 cultivar를 가진 pattern + 그 label
- 계산은 Part A의 `groupPathsIntoPatterns` 재활용

## Sub-phase ordering

1. **Part A** (signature 계산) — pure data transform, 30분 내 단위 테스트 가능.
2. **Part C + D** (summary strip + matrix) — 시각화 없이 데이터 확인 가능.
3. **Part B** (tube map pattern 기반 재구성) — 가장 큰 변경. 기존 TubeMapRenderer 수정.
4. **Part E** (gene track) — tube map 위 별도 컴포넌트, 독립 구현.
5. **Part F** (summary card) — 나머지 완료 후 header 조정.

## Files to modify

**Neew:**
- `src/lib/pangenome-path-signature.ts`
- `src/lib/pangenome-pattern-colors.ts`
- `src/components/og-detail/PatternSummaryStrip.tsx`
- `src/components/og-detail/CultivarPatternMatrix.tsx`
- `src/components/og-detail/GeneModelTrack.tsx`

**Modified:**
- `src/components/og-detail/TubeMapRenderer.tsx` — 대대적 재작성 (기존 layout 코드는 단일 path 렌더에 활용 가능)
- `src/components/og-detail/OgDetailGraphTab.tsx` — 새 컴포넌트 배치 + SortToggle 제거
- `src/pages/OgDetailPage.tsx` — summary card에 graph evidence 태그 추가
- (possibly) `src/lib/tube-map-layout.ts` — pattern-based lane layout으로 단순화 가능
- (possibly) `src/lib/tube-map-ordering.ts` — 삭제 또는 축소

**Deleted/Replaced:**
- `src/components/og-detail/SortToggle.tsx` — pattern collapse 시 sort mode 불필요

## Risks / Open questions

- **Phase block이 signature 폭발 유발 가능성**: baegilmi phase1/phase2가 서로 다른 signature면 pattern 개수 증가. 모니터링: 실 데이터에서 평균 pattern 개수 측정 후 결정.
- **Pattern 개수 상한**: 혹시 15+ pattern이 나오는 cluster는 tube map lane이 많아 답이 안 남. fallback: 상위 5개 + "others (N)" 묶음. MVP에서는 그대로 노출 + 상한 미도입.
- **색 팔레트 제약**: 동시에 구분 가능한 pattern 색은 8~10개 한계. 그 이상이면 밝기/패턴으로 구분. Phase 1은 10개 한도 가정.
- **Reference-likeness 계산 비용**: edit distance는 O(n²) — 각 pattern × reference 길이. 보통 node 100 이하라 큰 문제 없음. 측정 후 확인.
- **기존 tube map 고유 기능(phenotype-grouped ordering)은 제거됨**: 대신 cultivar matrix에서 heading group 정렬 가능. 사용자 피드백 받아야 확인.
- **Gene track은 anchor 좌표계 독립 view**: tube map과 시각적 정렬 시도하지 않음. 사용자가 "gene 경계가 tube node 경계와 어떻게 대응되는가"를 궁금해하면 Phase 3의 정확 정렬 구현 필요 (extractor에 node.ref_offset 추가). Phase 1은 "같은 region에 대한 두 관점"의 병치로 기능.
- **IRGSP reference cluster**: 여전히 per-cluster v2 graph 데이터 없음. Graph 탭에서 IRGSP ref 선택 시 현재 "No pangenome graph" + 대체 cluster 안내 유지.

## Verification

- [ ] `npm run check:all` 통과
- [ ] Unit test: `computePathSignatures`, `groupPathsIntoPatterns` 에 대해 합성 입력 + 예상 pattern 수
- [ ] 실제 OG0000002 (baegilmi_chr02_25655540) 데이터로 수동 확인:
  - Pattern 2–5 개 범위 내
  - Matrix가 16 cultivar 전부 표시
  - Pattern 컬럼 정렬이 정상 작동
- [ ] Scope 규율: Pattern label이 구조적 용어만 사용, group 용어 포함 안 함
- [ ] Complex OG 1개 (graph_error 클러스터 없는 고복잡도) 에서 렌더 성능 확인 (< 500ms)

## Result (completed 이동 시 작성)
- Status: TBD
- Notes: TBD

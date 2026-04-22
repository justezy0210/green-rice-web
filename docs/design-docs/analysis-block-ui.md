# 06. Analysis Block UI — Block-First Interpretation Design

Status: draft · cross-verified 2026-04-22 (Codex general-review)  
Date: 2026-04-22

Companion docs:

- `docs/product-specs/scope.md`
- `docs/product-specs/analysis-idea.md`
- `docs/exec-plans/active/2026-04-21-site-rebuild-analysis-workflow.md`
- `docs/exec-plans/active/2026-04-22-candidate-block-rollout.md` — implementation plan

## Terminology caveat (must be surfaced in every UI instance)

`CandidateBlock` is a review-unit abstraction for the analysis module. It
is NOT a claim about an inferred haplotype boundary or a recombination
block. Auto-aggregated blocks are fixed 1 Mb review windows; curated
blocks are expert-chosen review regions. Every block surface MUST carry:

> "Candidate block is a review unit; window boundaries do not imply an
> inferred haplotype."

The word "block" is retained for continuity with the design doc and the
server-side `followup_block_*` outputs, but the surfaces must consistently
read as *review unit*, not *haplotype block*.

## Goal

이 문서는 **"이 결과가 실제로 나와야 한다"**를 문서화하는 것이 아니라,

> "현재/향후 데이터로 이런 종류의 해석이 가능하도록 UI와 데이터 구조를 어떻게
> 설계해야 하는가"

를 정의한다.

목표 해석의 예시는 다음과 같다.

- "표현형 A 그룹에서 enrichment된 chr11 구조변이가 저항성 관련 orthogroup을 포함하고 있으며, 반대 그룹에서는 같은 패턴이 관찰되지 않았다. 따라서 이 locus는 표현형 A와 관련된 candidate block으로 우선 검토할 가치가 있다."
- "이 block 안의 candidate gene들은 WAK-like / NLR-like annotation을 가지며, OG 존재/부재 또는 copy pattern과 local SV pattern이 함께 그룹 차이를 보인다."

핵심은 **OG 하나를 읽는 UI**가 아니라, **SV + OG + annotation + phenotype contrast를 같은 좌표 구간에서 함께 읽는 UI**를 만드는 것이다.

## Problem

현 trait-first UI가 OG differential table 중심이면 다음 해석이 어렵다.

1. 여러 OG가 사실상 같은 locus / haplotype block을 가리키는 상황
2. OG pattern과 SV pattern이 같이 움직이는 상황
3. annotation이 있는 OG 몇 개와 주변 structural context를 함께 봐야 하는 상황
4. 사용자가 "여러 독립 candidate"와 "하나의 shared block"을 구분해야 하는 상황

즉, `OG row`는 설명 단위로는 너무 작고, `trait-wide ranking table`은 해석 단위로는 너무 크다.

중간 단위가 필요하다.

## Core Principle

분석 모듈 안에 **analysis-scoped first-class object**로 `CandidateBlock`을 도입한다.

- 전역 리소스의 새로운 정체성 객체가 아니다.
- canonical entity (`Gene`, `Orthogroup`, `Cultivar`, `Region`)를 대체하지 않는다.
- 오직 `/analysis/:runId/*` 안에서 해석 단위로만 존재한다.

즉:

- entity pages = 사실 / 구조 / reference
- block pages = evidence integration / interpretation / prioritization

## Why Block-First

block-first가 필요한 이유는 다음과 같다.

1. 동일 locus 주변의 여러 OG가 같이 올라오는 경우를 하나의 해석 단위로 묶을 수 있다.
2. group-specific SV와 candidate OG를 한 화면에서 연결할 수 있다.
3. annotation이 있는 gene family를 local context 안에서 읽을 수 있다.
4. "trait-specific locus"와 "shared developmental block"을 구분할 수 있다.
5. natural-language interpretation을 증거 패널 위에 얹되, 과장 없이 표현할 수 있다.

## CandidateBlock Definition

초기 정의는 다음과 같다.

```ts
type CandidateBlock = {
  blockId: string;
  runId: string;
  traitId: string;

  region: {
    chrom: string;
    start: number;
    end: number;
  };

  groupLabels: [string, string];
  groupCounts: Record<string, number>;

  leadSvIds: string[];
  svCount: number;
  candidateOgIds: string[];
  candidateOgCount: number;

  dominantSvType: 'INS' | 'DEL' | 'COMPLEX' | 'mixed';
  blockSpecificityGap: number | null;
  representativeAnnotations: string[];

  blockType:
    | 'og_sv_block'
    | 'sv_regulatory_block'
    | 'cnv_block'
    | 'shared_linked_block';

  curated: boolean;
  curationNote: string | null;
  summaryMarkdown: string | null;   // curated only
  blockSetVersion: number;          // bumps when the 1 Mb bin policy changes

  interpretationSummary: string | null;
  evidenceStatus: {
    groupSpecificity: 'ready' | 'partial' | 'pending';
    svImpact: 'ready' | 'partial' | 'pending';
    ogPattern: 'ready' | 'partial' | 'pending';
    function: 'ready' | 'partial' | 'pending';
    expression: 'pending' | 'external-future';
    qtl: 'pending' | 'external-future';
  };

  caveats: string[];
};
```

## Curated vs Auto

Curated and auto-aggregated blocks share one Firestore collection
(`analysis_runs/{runId}/blocks`). They differ on the `curated` flag and
on what fields the UI renders.

- curated = true
  - `blockId` prefix: `curated_`
  - `summaryMarkdown` rendered as prose
  - badge: `Curated review region`
  - colour tone: accent
- curated = false
  - `blockId` prefix: `bin_`
  - no `summaryMarkdown`; only counts + top rows
  - badge: `Auto-aggregated 1 Mb window`
  - colour tone: slate

Both carry the same terminology caveat strip.

## Near-boundary SV handling

`bin_{chr}_{start}_{end}` windows are non-overlapping, so an SV that
straddles a bin boundary shows up only in one bin by its anchor
position. The UI renders a `near-boundary` chip for SVs within 100 kb of
either edge, and block detail shows `Neighbor windows` links to the
two adjacent bins so reviewers can expand the picture. Promote policy
(`scripts/promote-analysis-run.py`) must record the neighbor block IDs
alongside each block doc.

## How Blocks Are Derived

현재 데이터 기준으로 `CandidateBlock`은 다음 단계에서 생성할 수 있다.

### Step 1. Grouping

- trait별 proposed grouping 확보
- borderline / unusable trait 정보 보존

### Step 2. Candidate OG selection

- OG differential 결과에서 threshold 또는 top-N 선정
- OG별 copy/presence pattern 확보

### Step 3. Candidate SV selection

- event-normalized SV matrix에서 trait별 group-frequency gap 계산
- 상위 SV events 확보

### Step 4. OG × SV intersection

- gene body / promoter / upstream / local neighborhood 기준으로
  SV와 candidate OG 연결

### Step 5. Evidence collapse into blocks

다음 규칙으로 block 후보를 만든다.

- 같은 trait 안에서
- 같은 chromosome 상에서
- 일정 거리 이내에 있는 linked SV / linked OG를 묶는다
- 또는 같은 OG cluster span / same repeated SV neighborhood를 하나로 collapse한다

초기 정책은 단순해야 한다.

- 거리 기반 collapse
- promoter window 고정
- same-SV repeated hit collapse
- same-1Mb bin summary

완벽한 biological block caller가 아니라, **UI interpretation을 위한 evidence collapse**가 목적이다.

## Block Types

초기 block type은 4종이면 충분하다.

### `og_sv_block`

- group-specific 또는 group-enriched SV
- nearby / overlapping candidate OG
- annotation 또는 OG pattern 동반

가장 일반적인 block 타입이다.

### `sv_regulatory_block`

- OG는 양쪽 그룹에 존재
- promoter / upstream SV만 group-specific
- regulatory candidate narrative에 적합

### `cnv_block`

- OG copy number 차이와 CNV-like SV가 함께 보이는 block

### `shared_linked_block`

- 여러 trait에서 같은 region이 반복 등장
- trait-specific보다는 shared background / linked region 가능성이 큼
- UI는 "shared across {N} runs" 요약만 표시하며, 명시적 haplotype 추정은 하지 않는다

이 분류는 biological ontology가 아니라 **설명용 UI badge**다. 이전 초안의
`shared_haplotype_block` 명칭은 scope.md의 overclaim 방지 원칙에 따라
`shared_linked_block`으로 교체했다.

## Route Design

분석 모듈 안에 block 전용 route를 둔다.

```text
/analysis/:runId/blocks
/analysis/:runId/block/:blockId
```

기존 route와 관계는 다음과 같다.

```text
/analysis/:runId/phenotype
/analysis/:runId/orthogroups
/analysis/:runId/variants
/analysis/:runId/intersections
/analysis/:runId/blocks
/analysis/:runId/block/:blockId
/analysis/:runId/candidates
/analysis/:runId/candidate/:candidateId
```

권장 구조:

- `blocks` = 해석 entry point
- `candidates` = OG-level ranking view
- entity pages = canonical reference

즉, block이 candidate를 대체하는 것이 아니라, **candidate를 읽는 상위 해석 단위**가 된다.

## UI Structure

## 1. Block List Page

사용자 질문:

> "어떤 locus를 먼저 읽어야 하는가?"

필수 요소:

- trait
- region
- group labels / counts
- dominant SV type
- candidate OG count
- annotated OG count
- representative annotation terms
- block specificity gap
- block type badge
- caveat badges
- scope strip

한 카드가 전달해야 하는 정보는 다음 수준이면 충분하다.

- `chr11:27–29 Mb`
- `SV gap 0.86`
- `candidate OG 12`
- `WAK-like / NLR-like`
- `A-group enriched`
- `candidate only`

이 페이지의 목적은 "top gene list"가 아니라 **priority locus selection**이다.

## 2. Block Detail Page

이 페이지가 실제 interpretation surface다.

### A. Header Summary

- trait
- group labels and counts
- region
- representative SVs
- candidate OG count
- block type
- interpretation summary
- scope strip

### B. Phenotype Contrast Panel

- A/B sample list
- excluded borderline samples
- grouping note
- small-sample caveat

### C. Structural Evidence Panel

- interval track or dense region strip
- SV table:
  - type
  - position
  - A freq
  - B freq
  - impact class

### D. Orthogroup Evidence Panel

- OG table:
  - OG id
  - copy / presence by group
  - annotation
  - linked gene
  - linked SV count

### E. Integrated Interpretation Panel

- 2–4문장 natural-language summary
- evidence axis statuses
- why-this-block
- why-not-stronger-yet

### F. Related Analyses Panel

- other traits where the same block or overlapping block was observed
- recent runs containing the same OG / SV / region

### G. Linked Entity Panel

- go to OG
- go to lead gene
- go to region page
- go to cultivar evidence

## 3. Region-Level Visualization

block interpretation은 좌표 기반이다.

따라서 최소한 다음 세 줄은 같은 화면에 있어야 한다.

- SV track
- gene / OG track
- group-specificity strip

이 세 레이어가 같이 보여야 사용자가

> "이 SV 옆에 annotation 있는 OG가 있고, 이 둘이 그룹 차이를 같이 보인다"

를 직관적으로 읽을 수 있다.

## 4. Evidence Matrix

block 안 OG들의 evidence matrix를 둔다.

열 예시:

- OG pattern
- gene-body SV
- promoter SV
- CNV support
- functional annotation
- shared across traits
- expression
- QTL

칸의 값은 가급적 `ready / partial / pending / external`로 보인다.

score보다 상태 badge가 중요하다.

## Narrative Layer

natural-language interpretation은 자유 생성보다 **template 기반 생성**이 안전하다.

## Allowed Templates

다음 정도 문장은 허용 가능하다.

- "표현형 A 그룹에서 enrichment된 structural variation이 이 block에서 관찰되었고, 반대 그룹에서는 같은 패턴이 관찰되지 않았다."
- "이 block에는 WAK-like / NLR-like annotation을 가진 candidate orthogroup이 포함되어 있다."
- "OG pattern과 local SV pattern이 함께 그룹 차이를 보이므로, 이 영역은 후속 검토 우선순위가 높은 candidate block으로 해석할 수 있다."
- "이 pattern은 표현형 A와 observed along with 된 candidate locus-level evidence다."

## Forbidden Templates

다음은 금지한다.

- "causal locus"
- "this block explains resistance"
- "validated disease-resistance region"
- "marker-ready locus"
- "this variant confers the phenotype"
- "determinant of the trait"

## Uncertainty Layer

이 해석 UI는 uncertainty를 항상 드러내야 한다.

필수 고정 노출 요소:

- proposed grouping
- small sample size
- candidate only
- not causal
- not validated
- expression/QTL missing if absent

이 정보는 접힌 help가 아니라 **항상 보이는 strip or badge**로 보여야 한다.

## Universal nav primitives (Codex refinement, 2026-04-22)

The following must exist on every entity page that can resolve a
block context:

- `Jump to block` chip on candidate rows, OG detail, SV rows, gene
  detail (where a lead candidate points at a block), and region page
  rows. A single helper (`src/lib/block-lookup.ts`) resolves
  (runId, chr, start, end) → blockId.
- `Trait ribbon` strip on OG / block / candidate surfaces, showing
  the 9-trait p-value heatmap plus the currently active run.
- `Pattern chips`: `OG shift`, `SV gap`, `promoter overlap`,
  `gene_body overlap`, `WAK-like`, `NLR-like`, `shared across runs`,
  `curated`, `repeated family cluster`.
- `Scope strip` on any surface that presents candidate evidence.
- `Provenance bar` on block detail: `runId`, `blockSetVersion`,
  `svReleaseId`, `intersectionReleaseId`, `geneModelVersion`,
  `scoringVersion`.

`repeated family cluster` is a guardrail for cases such as an NLR /
WAK tandem array where many annotations look convergent because they
are family paralogs inside the same physical cluster. The chip carries
the tooltip "may reflect linked family expansion, not multiple
independent candidate mechanisms".

## Cultivar coverage pill

Blocks, OG detail, and intersection surfaces MUST render a coverage
pill stating how many panel cultivars have gene models available
(currently 11 / 16). Without it, annotation convergence can appear
stronger than it is.

## Region page policy

`entity_analysis_index/region_*` uses an exact-string key
(`{cultivar}:{chr}:{start}-{end}`) which is brittle. The canonical
Region page lookup for analysis overlap must be a coordinate-based
`Overlapping analysis blocks` card, not the exact-string reverse
index. The region key reverse index is deprecated and should not be
written by new promote scripts.

## Relationship To Canonical Entities

block은 canonical entity가 아니다.

원칙:

- `Gene`, `Orthogroup`, `Cultivar`, `Region`는 canonical 유지
- `CandidateBlock`은 analysis module 내부 객체

연결 방식:

- block detail → canonical entity link
- canonical entity → `Observed In Candidate Blocks` panel

예:

- `/og/OG000123?run=...&block=...`
- `/region/...?...`

즉, block은 entity world 위에 얹히는 **analysis interpretation overlay**다.

## Data Model Suggestion

Firestore:

```text
analysis_runs/{runId}/blocks/{blockId}
analysis_runs/{runId}/blocks/{blockId}/ogs/{ogId}
analysis_runs/{runId}/blocks/{blockId}/svs/{eventId}
```

`blockId` convention:

- curated: `curated_{name}` (e.g. `curated_blb_chr11_resistance_block`),
  preserves the server-side directory name from `curated_blocks/`.
- auto: `bin_{chr}_{start}_{end}` in 1 Mb steps. Stable across re-runs
  as long as `blockSetVersion` does not change.

Storage:

```text
analysis_runs/{runId}/blocks/{blockId}.json.gz
analysis_runs/{runId}/blocks/{blockId}/export.tsv
```

추천 필드:

- region
- group counts
- lead SVs · SV neighbor chips
- candidate OG ids
- annotation terms · repeated-family flag
- block type
- curated flag + curationNote + summaryMarkdown (curated only)
- evidence status (per-axis ready / partial / pending / external-future)
- interpretation summary (template-generated)
- caveats (small sample, candidate only, not causal, n/16 cultivar coverage)
- neighbor block IDs (near-boundary follow-up)

Cross-entity side effects on promote:

- `analysis_runs/{runId}/candidates/{ogId}` gains `blockId`.
- `entity_analysis_index/og_{ogId}` gains `topBlocks`.
- `analysis_runs/{runId}` gains `topBlockIds`, `blockCount`,
  `intersectionReleaseId`.
- `entity_analysis_index/region_*` is no longer written; Region page
  consumes `OverlappingBlocksPanel` via coordinate lookup.

## MVP Path

### MVP 1

- existing candidate page 유지
- block summary cards만 추가
- block detail page는 read-only summary 중심

### MVP 2

- block detail page 추가
- interval track + OG evidence + SV evidence 제공
- natural-language interpretation template 적용

### MVP 3

- cross-trait shared block view
- `Observed In Analyses` backlink
- export / shareable report

## Decision Rule

이런 종류의 해석을 가능하게 하는 데 필요한 최소 조건은:

1. block 객체가 존재한다
2. SV와 OG가 같은 좌표 구간에서 collapse된다
3. annotation과 group contrast가 같은 화면에 보인다
4. natural-language summary는 evidence panel 위에 얹힌다
5. uncertainty는 숨기지 않는다

한 줄로 요약하면:

> **"trait → OG table" 구조로는 block 해석이 어렵다.**
> **"trait → candidate block → block 안의 SV / OG / annotation / uncertainty" 구조가 필요하다.**

## Practical Implication

향후 UI가 다음 문장을 말할 수 있으려면:

> "A-group-enriched structural variation was observed in this block, and
> candidate orthogroups with WAK-like / NLR-like annotation co-occur in the
> same region."

먼저 시스템이 말할 수 있어야 하는 것은 이것이다.

> "이 region 안에 어떤 SV가 있고, 어떤 OG가 연결되며, 두 evidence layer가 어떻게 같은 group contrast를 보이는가."

즉, 필요한 것은 더 강한 copy가 아니라 **더 적절한 객체와 화면 구조**다.

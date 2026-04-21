# [PLAN] Pivot Stage 3 — Gene model SVG + Region page (revised)

## Goal

2026-04-20에 작성했던 JBrowse-first Stage 3는 폐기 (사용자 피드백: 제품 정체성에 맞지 않음, JBrowse는 secondary tool로 후행). 대신 이 revised Stage 3는 **entity 쿼드 완성 + 유전자 구조 시각화**에 집중.

완료 기준:
1. **Gene detail page에 gene model SVG 삽입** — exon/intron/UTR 구조를 custom SVG로 렌더, 모든 16 cultivar에 대해. JBrowse 의존성 없음.
2. **Region page 신규** — `/region/:assembly/:chr/:start-:end` 좌표 기반 1급 엔티티 페이지. Overlapping genes + variants + local pangenome graph mini-view.
3. **OG page 보강** — core/soft-core/shell/private 배지 + copy architecture 해석 라벨 추가.
4. **Variant overlay on gene model** — 해당 gene 구간의 AF 데이터를 exon/intron 위 점으로 오버레이.
5. **Cross-page deep link** — Gene ↔ Region ↔ OG ↔ Cultivar 양방향 내비게이션.

## Context

### 설계 조언 (2026-04-21)

사용자가 외부 설계 조언을 받아옴. 요약:

- **Core UI 4개 엔티티**: Orthogroup / Gene / **Region** / Cultivar
- Gene detail의 1급 요소는 **custom gene model SVG**, not JBrowse
- **Region page**는 좌표 기반 새 엔티티
- JBrowse는 secondary, deep-link power-user tool (Stage 4+)
- Synteny pipeline은 JBrowse Linear Synteny보다 선결 (Stage 4+)

이 조언이 현재 제품(phenotype-first에서 entity-centered로 pivot한) 정체성과 잘 맞음. JBrowse를 지금 넣으면 제품을 범용 DB로 뒤덮음.

### 현재 상태 대비 gap

| 조언 항목 | 현재 | Stage 3 범위? |
|---|---|---|
| OG page: core/shell/private | ❌ | ✓ 포함 (데이터 기반 즉시 계산 가능) |
| OG page: copy architecture 해석 | 숫자만 있음 | ✓ 포함 |
| Gene detail: gene model SVG | ❌ 없음 | ✓ 핵심 |
| Gene detail: variant overlay | 부분 (OG AF table) | ✓ SVG 위 점으로 |
| Gene detail: local graph summary | ❌ | ✓ 포함 (기존 graph 재활용) |
| **Region page** | ❌ | ✓ 신규 엔티티 |
| Cultivar page: private OGs / outliers / non-ref | ❌ | ✗ Stage 3.5 이월 |
| JBrowse | ❌ | ✗ Stage 4 이월 |

### 데이터 현황

- **모든 16 cultivar GFF3이 서버에 있음** (`build-gene-coords.py`가 이미 읽고 있음). Storage에는 baegilmi만 파싱 JSON으로 올라가 있음.
- **IRGSP GFF3**은 로컬 `data/irgsp-1.0.gff`에 있음 (55 MB).
- **Pangenome VCF**는 Storage에 있음 (`data/green-rice-pg.vcf.gz`, IRGSP 좌표).
- **Gene 좌표 per OG**는 이미 Storage(`og_gene_coords/`)에 있음 — 하지만 exon/intron 상세 아님. Gene-level bbox만.

## Approach

### Part A — Gene model precompute (서버)

**신규 스크립트**: `scripts/build-gene-models.py` (서버에서 실행)

입력:
- 16 cultivar GFF3 경로 + IRGSP GFF3 경로
- `--version N` (이후 bump 시 동일)

출력:
```
gene_models/v{N}/
├── _manifest.json               # 파티션 리스트 + per-cultivar gene count + 버전
└── by_prefix/
    ├── BA.json
    ├── CH.json
    ...
```

각 파티션 JSON 구조:
```jsonc
{
  "version": N,
  "prefix": "BA",
  "genes": {
    "BAE_g000123": {
      "cultivar": "baegilmi",
      "chr": "chr06",
      "start": 9668800,
      "end": 9689470,
      "strand": "+",
      "transcripts": [
        {
          "id": "BAE_g000123.t1",
          "exons": [
            { "start": 9668800, "end": 9669200, "type": "UTR5" },
            { "start": 9669201, "end": 9670000, "type": "CDS" },
            { "start": 9670300, "end": 9671000, "type": "CDS" },
            ...
          ]
        }
      ]
    },
    ...
  }
}
```

**단순화 규칙**:
- 한 gene의 여러 isoform 중 **대표 transcript만** 저장 (첫 번째 mRNA, 또는 가장 긴 CDS 합). 다중 isoform UI는 Stage 3.5.
- UTR5 / UTR3 / CDS 세 종류만. `intron`은 SVG에서 gap으로 렌더하므로 저장하지 않음.
- `prefix` = gene ID 첫 2자 영숫자 대문자 (Stage 2B gene_index와 동일 partition).

**파티션 공유 가능성**: gene_index(역방향)과 gene_models(상세)는 같은 prefix 파티션을 씀. 향후 통합 캐시 가능하지만 Stage 3에선 분리 유지.

**크기 추정**: 508k gene × 평균 6 exon × ~60 바이트 JSON = ~180 MB 전체. 8 파티션 기준 평균 23 MB / 파티션. gene_index보다 크지만 여전히 lazy-load 가능. 단일 gene만 필요할 때 해당 파티션 하나만 fetch.

**스토리지 규칙** (`storage.rules`):
```
match /gene_models/{path=**} {
  allow read: if true;
  allow write: if false;
}
```

### Part B — Gene model SVG 컴포넌트

**신규 파일**: `src/lib/gene-model.ts` + `src/components/gene/GeneModelSvg.tsx`

- Pure function `renderGeneModel({gene, variants, width, ...})` → SVG `<g>` element
- Exon: 색상 박스 (UTR 밝게, CDS 진하게)
- Intron: 얇은 라인 + chevron (strand 방향)
- Variant overlay: exon 위 점 (AF에 따라 색 진하기)

**스타일**:
- CSS grid 아니고 SVG scale — 좌표를 px에 선형 매핑
- 폭 가변 (컨테이너 100%)
- 접근성: `aria-label` + 각 exon에 title

**단일 transcript 기본**. 여러 transcript는 Stage 3.5.

### Part C — Gene detail 확장

`src/pages/GeneDetailPage.tsx` 섹션 추가:

1. **Gene model SVG** (새 섹션) — gene_models 파티션 로드 + 해당 gene의 transcript 렌더
2. **Variant overlay** — 해당 gene 좌표 범위에서 AF 데이터 가져와 SVG 위에 점으로
3. **Local graph summary** — 해당 gene이 속한 OG의 cluster 중 이 gene을 포함하는 cluster의 graph mini-view
4. "Open in Region page" 버튼 → `/region/{assembly}/{chr}/{start-flank}-{end+flank}`

### Part D — Region page 신규

**라우트**: `/region/:assembly/:chr/:range` (range 형식 `start-end`)

**섹션**:
| 섹션 | 데이터 출처 |
|---|---|
| Header: 좌표 + assembly | URL params |
| Overlapping genes | gene_models 파티션(들) 전체 스캔하는 대신 new "by-chr" 보조 인덱스 또는 gene_index 재활용 — 구현 시 선택 |
| Overlapping variants | pangenome VCF 읽기 (IRGSP 기준만; 비-IRGSP assembly에선 "이 기능은 IRGSP에서 가능") |
| Overlapping repeats | ❌ Stage 3.5 이월 (데이터 미정) |
| Local pangenome graph mini-view | 기존 `useOgRegionGraph` 재활용 — region과 겹치는 OG cluster 자동 해결 |
| "View in other cultivars" | 선택. 현재 assembly → 다른 cultivar로 같은 좌표 liftover (Stage 4) |

**Region → OG 역참조**: graph 클러스터가 덮는 좌표가 이 region과 겹치면 해당 OG 클러스터 표시. 이를 위해 graph manifest에 좌표 인덱스 필요 — 현재 manifest 구조에서 계산 가능 (cluster마다 chr/start/end 있음).

**MVP scope**:
- IRGSP assembly만 variant overlay 완전 지원
- 다른 assembly는 overlapping genes만 (variant는 "IRGSP 좌표로 보려면 ..."으로 안내)

### Part E — OG page 보강

**신규 컴포넌트**: `src/components/og-detail/OgCoreShellBadge.tsx`

- copy matrix에서 즉시 계산:
  - cultivar count with copy≥1 = N
  - panel size = 16 (Korean cultivars, IRGSP 제외)
  - **core**: N = 16
  - **soft-core**: 14 ≤ N ≤ 15
  - **shell**: 2 ≤ N ≤ 13
  - **private**: N = 1
- OG Detail page 헤더에 배지로 표시

**Copy architecture 라벨**:
- 숫자 분포 해석을 자동 라벨로:
  - `"16/16 present, all singleton"` → stable
  - `"3 cultivars tandem (×2–3), 13 singleton"` → expansion in subset
  - `"14 present, 2 absent-evidence-pending"` → near-core with gaps
- `src/lib/og-copy-architecture.ts` 순수 함수로

이 두 가지는 **gene_models 파이프라인과 독립** — 즉시 배포 가능.

### Part F — Cross-page deep linking

| From | To | Link |
|---|---|---|
| Gene detail | Region page | `/region/{cultivar_id}/{chr}/{gene.start - 5000}-{gene.end + 5000}` |
| Gene detail | OG detail | 이미 존재 |
| Region page | Gene detail | overlapping genes 리스트에서 |
| OG detail | Region page | selectedCluster의 좌표로 |
| Cultivar detail | Region page | "browse chr01" 같은 기본 진입 (추후) |

## Sub-phase ordering

**3A — gene_models precompute (서버 선결)**
- `scripts/build-gene-models.py` 작성
- 서버에서 16 cultivar + IRGSP에 대해 실행
- `storage.rules` 업데이트 + 배포

**3B — Gene model SVG 컴포넌트 + Gene detail 확장**
- 독립 컴포넌트
- gene_models 로드 hook

**3C — Region page**
- 라우트 + 기본 렌더
- Overlapping genes / variants / graph mini-view

**3D — OG page 보강 (core/shell/private + copy architecture)**
- 3A–3C와 독립, 병렬 가능

**3E — Cross-page deep linking**
- 3A–3D 완료 후 wiring

### 실행 순서 권고

1. **3D 먼저** (데이터 의존 없음, 순수 UI 보강) — 1–2일
2. **3A 서버 파이프라인** — 도구 설치 + 실행 포함 하루
3. **3B Gene model SVG** — 3A 완료 후 2–3일
4. **3C Region page** — 3B와 병렬 가능 2–3일
5. **3E deep linking** — 마지막 1일

전체 ~1.5–2주 규모.

## Files to modify

**3A (server):**
- `scripts/build-gene-models.py` (신규)
- `storage.rules` (gene_models/** public read)
- 배포 후: 서버 스크립트 실행 (16 cultivar + IRGSP)

**3B (client — gene model SVG):**
- `src/types/gene-model.ts` (신규)
- `src/lib/storage-paths.ts` (gene_models 경로)
- `src/hooks/useGeneModel.ts` (신규, lazy partition fetch)
- `src/lib/gene-model.ts` (신규, SVG 렌더 로직)
- `src/components/gene/GeneModelSvg.tsx` (신규)
- `src/pages/GeneDetailPage.tsx` (섹션 추가)

**3C (Region page):**
- `src/pages/RegionPage.tsx` (신규)
- `src/hooks/useOverlappingGenes.ts` (신규)
- `src/hooks/useOverlappingVariants.ts` (신규, VCF tabix? — 아래 Risk 참조)
- `src/App.tsx` (라우트)

**3D (OG boosts):**
- `src/lib/og-copy-architecture.ts` (신규)
- `src/components/og-detail/OgCoreShellBadge.tsx` (신규)
- `src/pages/OgDetailPage.tsx` (배지 + 라벨 삽입)

**3E (deep links):**
- `src/pages/GeneDetailPage.tsx`
- `src/pages/CultivarDetailPage.tsx`
- `src/pages/OgDetailPage.tsx`
- `src/components/og-detail/*`

## Scope boundaries (Stage 3 밖)

- **Multi-isoform display** — Stage 3.5
- **Repeat track overlay** on gene model / region — Stage 3.5
- **Cultivar page: private OGs / outliers / non-ref sequence** — Stage 3.5
- **Functional annotation (Pfam/InterPro/GO)** — Stage 2.5
- **JBrowse embed, synteny pipeline, cross-cultivar coordinate liftover** — Stage 4
- **Region → variants on non-IRGSP assembly** — VCF가 IRGSP 좌표라 liftover 필요, Stage 4

## Risks / Open questions

- **GFF3 파싱 품질 편차**: 16 cultivar 중 annotation pipeline이 동일한지 확인 필요. 서로 다른 pipeline이면 exon 경계, UTR 정의가 다를 수 있음. 같은 script로 일괄 파싱하면 일관성은 보장되지만 원본 quality 편차는 남음.
- **gene_models 크기**: 180 MB 추정. 파티션 분할은 OK지만 한 파티션이 20+ MB면 모바일에서 느림. Stage 3 단순화로 단일 transcript만 저장 — 크기 절반 이하 예상. 실측 후 재검토.
- **Variant overlay 성능**: VCF에서 해당 gene 구간 추출은 서버 전처리 or 클라이언트 tabix-like 작업 필요. Stage 3 MVP는 **OG의 anchor-locus AF bundle 재활용** — 이미 per-OG × cluster로 저장돼 있어 gene이 속한 cluster의 variants를 SVG에 overlay. 완전한 region-based VCF 쿼리는 Stage 4.
- **Region page의 variants**: 위와 같은 이유로 IRGSP 전용. 비-IRGSP assembly region은 해당 좌표가 포함된 OG cluster가 있어야 AF 표시 가능.
- **Core/shell/private의 IRGSP 처리**: IRGSP는 panel size에서 제외 (reference). 16 Korean cultivars만 카운트. (scope.md 정체성과 일치.)
- **Representative transcript 선택 규칙**: 첫 mRNA는 단순하지만 부정확. 가장 긴 CDS 합 규칙이 일반적. Stage 3에선 longest-CDS로 시작, 필요 시 Stage 3.5에서 선택기 UI 추가.
- **bgzip/tabix on server**: VCF 쿼리를 서버에서 돌릴지, 아니면 **OG cluster AF bundle 재활용으로 우회**할지. 후자가 훨씬 단순. MVP는 후자 채택.
- **서버에 htslib 필요 없음** (우회 경로 덕분). gene_models 파이프라인은 pure Python GFF3 파싱만.

## Verification

- [ ] `npm run check:all` 통과
- [ ] `build-gene-models.py` 로컬 dry-run으로 출력 JSON 샘플 검증
- [ ] 서버에서 16 cultivar + IRGSP 실제 빌드 + Storage 업로드 성공
- [ ] Gene detail 페이지에서 baegilmi + IRGSP 두 cultivar의 gene에 대해 SVG 정상 렌더
- [ ] Variant overlay가 해당 gene 구간의 AF 데이터와 좌표 일치
- [ ] OG detail에 core/shell/private 배지 + copy architecture 라벨
- [ ] `/region/irgsp/chr06/9500000-9520000` 직접 접근 시 overlapping genes + graph mini-view 렌더
- [ ] Gene → Region, Region → Gene, OG → Region 딥링크 작동

## Result (completed 이동 시 작성)
- Status: TBD
- Notes: TBD

# Cultivar Anchor System — Gene-centric Evidence Exploration (v2)

Status: active — 2026-04-17
Reviewed: cross-verified (Claude + Codex)

## Problem

모든 deep dive (AF, synteny/graph) 가 IRGSP gene 좌표에 의존한다. 하지만:
- 88% candidate OG에 IRGSP gene이 없다
- IRGSP gene이 있어도 cultivar-specific copy의 region은 못 본다
- 사용자마다 관심 있는 anchor gene/cultivar가 다르다

## Goal

사용자가 **OG 내 아무 gene cluster를 선택**하면 → 그 region 기준으로 graph + AF가 보인다.

## Architecture

```
Gene Members 탭
  └─ cultivar별 gene list + 좌표 (chr:start-end)
  └─ 좌표 기준 클러스터링 (tandem / dispersed 구분)
  └─ 클러스터 클릭
       ├─ Graph: 해당 region의 pangenome tube map
       └─ AF: 해당 region의 variant + group별 AF
```

## Execution Order (v2 — pilot-first)

### Step 0: ID Crosswalk Table

OG member ID ↔ GFF3 gene ID ↔ GBZ path name ↔ VCF sample name 정합성 확인.

**Input:**
- `og-members/chunk_*.json` — gene IDs (e.g., `baegilmi_g12345.t1`)
- 11 cultivar GFF3 — gene IDs (e.g., `baegilmi_g12345`)
- GBZ path names (e.g., `baegilmi#0#chr01#854`)
- VCF sample names (e.g., `baegilmi`)

**Output:** `crosswalk.json`
```json
{
  "baegilmi": {
    "og_suffix": ".t1",
    "gff_gene_prefix": "baegilmi_g",
    "gbz_sample": "baegilmi",
    "vcf_sample": "baegilmi",
    "gff_path": "/path/to/baegilmi.gff3",
    "chr01_paths": ["baegilmi#0#chr01#854", "baegilmi#0#chr01#17551590", ...]
  }
}
```

**Validation:** OG gene ID → strip `.t1` → GFF3에서 좌표 매칭 성공률 확인.

### Step 1: Cultivar Gene Coordinate Index

서버에서 전 품종 GFF3 파싱 → OG member gene ID에 좌표 매핑.

**Output:** `og_gene_coords/chunk_{NNN}.json` (1000 OGs per chunk)
```typescript
{
  "OG0000000": {
    "baegilmi": [
      { "id": "baegilmi_g12345.t1", "chr": "chr01", "start": 5000123, "end": 5002456, "strand": "+" }
    ]
  }
}
```

### Step 2: Frontend — Gene Members + Cluster Display

Client-side에서 좌표 데이터 로드 후:
- 같은 cultivar + 같은 chr + proximity → tandem cluster
- 다른 chr 또는 원거리 → dispersed
- Cluster threshold: pilot에서 경험적 결정 (10/25/50kb 비교)

### Step 2.5: Pilot — 100-200 OG Liftover + Graph + AF

**목적:** 실현 가능성 + 성능 + 품질 측정.

**Sample 선택:**
- 20 single-gene OGs (simple)
- 20 tandem OGs (2-5 copies)
- 20 multi-copy OGs (10+ copies)
- 20 no-IRGSP OGs
- 20 high-delta OGs (big copy count difference)

**Per-region 파이프라인 (서버):**
1. Cluster span 결정: `min(start) - flank` ~ `max(end) + flank`
2. `halLiftover` → IRGSP 좌표 변환
3. `vg chunk` → cultivar path 기준 subgraph 추출
4. VCF variant 추출 (lifted IRGSP region)
5. Per-group AF 계산

**측정 항목:**
- halLiftover 성공률 (1:1 mapped / split / multi / unmapped)
- vg chunk 성공률 + subgraph size (nodes, paths)
- VCF variant count per region
- Wall-clock per region
- 실패 유형 분포

**결정 사항 (pilot 후):**
- Cluster threshold (10/25/50kb)
- Flank size (5/10/20kb)
- Max region length cap
- halLiftover 해석 규칙 (1:1 only? split 허용?)
- 예상 전체 runtime

### Step 3: Region Definition Rules (pilot 결과 기반)

- Region = cluster span + bounded flank (양쪽 Xkb, max Ykb cap)
- halLiftover 1:1 매핑만 허용 vs split 허용
- Multi-mapped → 첫 번째 hit 사용 or skip

### Step 4: Output Schema

```typescript
interface RegionData {
  schemaVersion: 1;
  ogId: string;
  clusterId: string;
  source: 'cultivar-anchor';

  // Anchor definition
  anchor: {
    cultivar: string;
    genes: { id: string; chr: string; start: number; end: number; strand: string }[];
    regionSpan: { chr: string; start: number; end: number };
    flankBp: number;
  };

  // Liftover result
  liftover: {
    status: 'mapped' | 'partial' | 'unmapped' | 'multimap';
    irgspRegion: { chr: string; start: number; end: number } | null;
    coverage: number;
  };

  // Graph (may be null if extraction fails)
  graph: {
    nodes: { id: string; seq?: string; len: number }[];
    edges: { from: string; to: string }[];
    paths: { name: string; sample: string; visits: { nodeId: string; reverse: boolean }[] }[];
  } | null;

  // Allele frequency (may be null if liftover fails)
  alleleFrequency: {
    groupLabels: string[];
    variants: {
      chr: string;
      pos: number;
      ref: string;
      alt: string;
      afByGroup: Record<string, number>;
      countsByGroup: Record<string, { ref: number; alt: number; total: number }>;
      deltaAf: number;
    }[];
  } | null;

  // QC
  status: {
    graph: 'ok' | 'empty' | 'error';
    af: 'ok' | 'no_variants' | 'unmapped' | 'error';
    errorMessage?: string;
  };
}
```

### Step 5: Full Batch Pre-compute

Pilot 성공 후:
- 모든 candidate OG의 모든 cluster
- 예상: 3,000-5,000 regions
- 병렬화 (jobs=4-8)
- Per-region manifest 생성 (QC report)

### Step 6: Frontend — Cluster Click → Region Data

- Gene Members 탭에서 cluster 클릭 → `og_region/{ogId}/{clusterId}.json` fetch
- Graph 섹션: tube map 렌더 (기존 TubeMapRenderer 재사용)
- AF 섹션: variant table (기존 AF component 재사용)
- Status 표시: graph-only / AF-only / both / unavailable

## Storage Layout

```
og_gene_coords/chunk_{NNN}.json       ← Step 1 (좌표 인덱스)
og_region/{ogId}/{clusterId}.json     ← Step 5 (per-cluster graph + AF)
metadata/crosswalk.json               ← Step 0 (ID 매핑)
```

## Failure Status Codes

| Code | Meaning |
|------|---------|
| `MAPPED` | halLiftover 1:1 성공 |
| `PARTIAL` | liftover 부분 매핑 (coverage < 0.8) |
| `UNMAPPED` | liftover 실패 → AF 불가, graph만 |
| `MULTIMAP` | 다중 매핑 → 첫 hit 사용, 경고 표시 |
| `EMPTY_GRAPH` | vg chunk에서 빈 subgraph |
| `NO_VARIANTS` | VCF에서 variant 0개 |
| `ID_JOIN_FAIL` | gene ID가 GFF3에서 안 찾아짐 |

## Constraints

- VCF는 IRGSP 좌표 기준 → cultivar region은 halLiftover 필요
- vg chunk -T → thread names 불안정 → path metadata + VCF genotype 보조 매핑
- Max region cap: 200kb (너무 넓은 cluster는 분할)
- 기존 IRGSP-only 데이터는 유지, `source` 필드로 구분

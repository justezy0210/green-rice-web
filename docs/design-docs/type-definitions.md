# 03. 데이터 타입 정의

> **현재 SSOT는 코드 기준 3-env heading date** (early / normal / late). 초기 설계의 5-env 스키마는 구 설계이며, 실제 구현은 `src/types/phenotype.ts` 및 `src/types/cultivar.ts`를 따른다.

## 표현형 타입 (`types/phenotype.ts`)

```typescript
// 실제 구현 (3-env)
export interface PhenotypeRecord {
  cultivar: string;
  daysToHeading: {
    early: number | null;
    normal: number | null;
    late: number | null;
  };
  culmLength: number | null;           // cm
  panicleLength: number | null;        // cm
  panicleNumber: number | null;
  spikeletsPerPanicle: number | null;
  ripeningRate: number | null;         // %
  grainWeight1000: number | null;      // g (1,000-Grain Weight of Brown Rice)
  preHarvestSprouting: number | null;  // %
  bacterialLeafBlight: number | null;  // resistant strains count
}

// 표현형 메타데이터 (컬럼 정보)
export interface PhenotypeField {
  key: string;
  label: string;
  unit: string;
  category: 'heading' | 'morphology' | 'yield' | 'quality' | 'resistance';
  description?: string;
}

// 데이터셋 전체 요약 통계
export interface PhenotypeDatasetSummary {
  totalCultivars: number;
  totalFields: number;
  missingRate: number;            // 0~1
  fieldSummaries: PhenotypeFieldSummary[];
}

export interface PhenotypeFieldSummary {
  field: PhenotypeField;
  validCount: number;
  missingCount: number;
  min: number;
  max: number;
  mean: number;
  stdDev: number;
}
```

## 유전형 타입 Placeholder (`types/genotype.ts`)

```typescript
// 향후 확장용 — 실 데이터 연동 시 구체화
export interface GenotypeRecord {
  cultivar: string;
  snpData?: SNPVariant[];
  markerData?: MarkerInfo[];
  geneAnnotations?: GeneAnnotation[];
}

export interface SNPVariant {
  chromosome: string;
  position: number;
  refAllele: string;
  altAllele: string;
  genotype: string;
}

export interface MarkerInfo {
  markerId: string;
  chromosome: string;
  position: number;
  allele: string;
}

export interface GeneAnnotation {
  geneId: string;
  geneName: string;
  chromosome: string;
  startPos: number;
  endPos: number;
  annotation: string;
}
```

## 공통 타입 (`types/common.ts`)

```typescript
// 데이터 로딩 상태
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// 필터 옵션
export interface FilterOptions {
  cultivarSearch: string;
  selectedFields: string[];
  category?: string;
}

// 비교 설정
export interface ComparisonConfig {
  targetField: string;
  groupByField: string;
  groups: ComparisonGroup[];
}

export interface ComparisonGroup {
  name: string;
  cultivars: string[];
}

// 정렬
export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

// 페이지네이션
export interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
}
```

## CSV → 타입 매핑

| CSV Column | Type Field | Category |
|-----------|-----------|----------|
| Cultivar | cultivar | - |
| 22' Early season Days to heading (days) | daysToHeading.earlyseason22 | heading |
| 22' late season Days to heading (days) | daysToHeading.lateseason22 | heading |
| 23' early season Days to heading (days) | daysToHeading.earlyseason23 | heading |
| 23' normal season Days to heading (days) | daysToHeading.normalseason23 | heading |
| 23' late season Days to heading (days) | daysToHeading.lateseason23 | heading |
| Culm Length (cm) | culmLength | morphology |
| Panicle Length (cm) | panicleLength | morphology |
| Panicle Number | panicleNumber | morphology |
| Spikelets per Panicle | spikeletsPerPanicle | yield |
| Ripening Rate (%) | ripeningRate | yield |
| 1,000-Grain Weight of Brown Rice (g) | grainWeight1000 | yield |
| Pre-harvest Sprouting (%) | preHarvestSprouting | quality |
| Bacterial Leaf Blight | bacterialLeafBlight | resistance |

# 05. MVP 화면별 컴포넌트 설계

## 공통 레이아웃

### Layout
- **Header**: 로고, 네비게이션 링크 (Dashboard, Comparison, Data), 로그인 버튼
- **Sidebar**: 없음 (MVP는 심플한 top-nav)
- **Main Content**: 페이지 컨텐츠 영역

## 차트 Wrapper 컴포넌트 (`components/charts/`)

### BarChartWrapper
- props: `data`, `labels`, `title`, `xLabel`, `yLabel`
- Chart.js Bar 차트 래핑

### ScatterChartWrapper
- props: `datasets`, `title`, `xLabel`, `yLabel`
- Chart.js Scatter 차트 래핑

### BoxPlotWrapper (향후)
- 표현형 분포 비교용

> 모든 차트 wrapper는 공통 옵션(반응형, 툴팁, 색상 팔레트)을 공유

## Dashboard 컴포넌트 (`components/dashboard/`)

### StatsCardGrid
- 4개의 통계 카드를 그리드로 배치
- 카드: 전체 품종 수, 표현형 항목 수, 결측치 비율, 데이터 품질 점수

### PhenotypeDistributionChart
- 선택한 표현형의 품종별 분포를 Bar 차트로 표시
- 표현형 선택 드롭다운 포함

### MissingDataHeatmap
- 품종 × 표현형 행렬에서 결측 여부를 시각적으로 표현
- 색상 코딩: 존재(green) / 결측(red)

### SampleCountByField
- 각 표현형 필드별 유효 데이터 개수를 Bar 차트로 표시

## Comparison 컴포넌트 (`components/comparison/`)

### PhenotypeSelector
- shadcn Select 컴포넌트
- 비교 기준 표현형 선택

### GroupConfigPanel
- 그룹 분류 기준 설정 (예: 출수일 기준 조생/만생 분류)
- 사용자가 threshold 값을 조정 가능

### ComparisonStatsCards
- 그룹별 평균, 중앙값, 범위 등 통계 카드

### GroupComparisonChart
- 그룹 간 선택한 표현형 비교 Bar 차트

### TopDifferencesTable
- 그룹 간 차이가 큰 품종/항목을 테이블로 표시

### GenotypePlaceholder
- "Genotype comparison results will appear here"
- 향후 SNP/marker 비교 결과 삽입 영역

## DataTable 컴포넌트 (`components/data-table/`)

### SearchInput
- 품종명 검색 필터

### PhenotypeTable
- shadcn Table 기반
- sortable column headers
- pagination controls
- 결측값은 "-" 또는 "N/A"로 표시

### TabNavigation
- Phenotype (활성) / Genotype (비활성, placeholder) / Metadata (비활성)

### DownloadButton
- CSV 다운로드 (현재 표시 중인 필터링된 데이터 기준)

### ColumnVisibilityToggle
- 표시할 컬럼 선택 체크박스 드롭다운

## 데이터 흐름 요약

```
CSV File (public/data/)
  ↓ fetch + PapaParse
data-service.ts (추상화 레이어)
  ↓
usePhenotypeData() hook
  ↓ state: records, summary, loading, error
Page Components
  ↓ props
Widget/Chart Components
```

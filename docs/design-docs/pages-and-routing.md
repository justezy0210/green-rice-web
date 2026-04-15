# 02. 페이지 구조 및 라우팅

## 라우팅 맵

| Path | Page | 설명 | 인증 필요 |
|------|------|------|-----------|
| `/` | DashboardPage | 메인 대시보드 | No |
| `/comparison` | ComparisonPage | 표현형 비교 | No |
| `/data` | DataTablePage | 품종별 데이터 테이블 | No |
| `/login` | LoginPage | 로그인 | No |

> CSV 다운로드, 관리 기능 등은 추후 인증 필요로 전환 가능

## React Router 구조

```tsx
<BrowserRouter>
  <Layout>
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/comparison" element={<ComparisonPage />} />
      <Route path="/data" element={<DataTablePage />} />
      <Route path="/login" element={<LoginPage />} />
    </Routes>
  </Layout>
</BrowserRouter>
```

## 페이지별 구성

### 1. DashboardPage (`/`)
- **StatsCards**: 전체 품종 수, 표현형 항목 수, 결측치 비율, 데이터 품질 점수
- **PhenotypeDistributionChart**: 주요 표현형 분포 (Bar/Box chart)
- **SampleCountChart**: 표현형별 유효 샘플 수
- **DataQualityOverview**: 결측치 히트맵 또는 요약
- **FilterBar**: 품종명, 표현형 그룹 필터

### 2. ComparisonPage (`/comparison`)
- **PhenotypeSelector**: 비교할 표현형 선택
- **GroupSelector**: 그룹 기준 선택 (예: 출수일 기준 조생/중생/만생)
- **ComparisonStatsCards**: 그룹별 통계 요약 (평균, 분산 등)
- **ComparisonChart**: 그룹 간 차이 시각화 (Bar, Scatter)
- **TopDifferenceTable**: 차이가 큰 품종 목록
- **GenotypePlaceholder**: 향후 genotype 비교 결과 영역

### 3. DataTablePage (`/data`)
- **SearchBar**: 품종명 검색
- **DataTable**: sortable, paginated 표
- **TabNavigation**: Phenotype / Genotype(placeholder) / Metadata 탭
- **DownloadButton**: CSV 다운로드
- **ColumnToggle**: 컬럼 표시/숨기기

### 4. LoginPage (`/login`)
- **EmailLoginForm**: 이메일/비밀번호 로그인
- 향후 Google OAuth 등 추가 가능

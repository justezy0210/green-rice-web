# Product Vision

## Identity

> 16개 한국 벼 품종의 표현형과 pangenome variation을 연결해 탐색하는 웹 데이터베이스

## Core Concept

품종명이나 유전자명을 검색하는 기존 DB가 아니라, **표현형 차이에서 출발해서 유전체 차이를 추적**할 수 있는 DB.

### Key Questions This DB Answers

- 조생종과 만생종을 가르는 후보 유전자는?
- 특정 품종의 heading date 관련 유전자는 다른 품종에서 어떤 haplotype을 가지는가?
- 이 표현형과 관련된 유전자가 PAV, SV, copy number 변화, orthogroup 차이와 연결되는가?
- 특정 유전자 주변 구조가 품종마다 어떻게 다른가?

### Data Sources

phenotype + assembly + annotation + cactus pangenome + orthofinder

---

## Feature 1: Phenotype-driven Exploration

사용자가 phenotype을 선택하고, 품종 그룹을 나누고, 그룹 간 유전체 정보를 비교하는 워크플로우.

### User Flow

```
Select phenotype → View group distribution → Compare groups
```

### Group Comparison Outputs

| Output | Description |
|--------|-------------|
| Group distribution | 그룹별 품종 분포 |
| Candidate genes | 관련 후보 유전자 목록 |
| Allele frequency | 그룹 간 allele frequency 차이 |
| PAV/SV hotspot | 구조 변이 핫스팟 |
| Orthogroup diff | Orthogroup 차이 |
| Sequence tube map | Pangenome sequence tube map |

---

## Feature 2: Auto-Grouping Pipeline

품종이 추가/편집되면 trait별 자동 그룹핑을 수행하는 Cloud Function 파이프라인.

### Pipeline Outputs

1. **Group labels** — early / mid-late, low / intermediate / high
2. **Assignment probability** — 소속 신뢰도
3. **Borderline flag** — 경계 품종 판정
4. **Linkage table** — gene/SV/PAV/orthogroup 연결용 저장 테이블

### Trait Types

| Type | Examples | Grouping Method |
|------|----------|-----------------|
| **Multi-env continuous** | heading date (22E, 22L, 23E, 23N, 23L) | Multivariate GMM |
| **Single continuous** | culm length, panicle length, spikelets/panicle | 1D GMM |
| **Binary/resistance** | K1, K2, K3 (resistant/susceptible) | Keep actual class |
| **High-missing** | traits with >40% missing | Flag as low-confidence |

### Pipeline Steps

#### Step 1. Trait Metadata
각 형질의 속성(type, direction, unit)을 등록.

#### Step 2. Data Quality Check

| Check | Rule |
|-------|------|
| Sample count | < 6 cultivars → grouping not recommended |
| Missing rate | > 40% → low-confidence flag |
| Variance | Very low → skip grouping |
| Outliers | Detect and flag |

#### Step 3. Preprocessing
- **Z-score normalization** — 환경별 scale 차이 보정 (e.g. 22E와 22L 범위 차이)
- **Direction metadata** — heading_date: higher=later, culm_length: higher=taller, resistance: higher=stronger

#### Step 4. Feature Matrix
- Multi-env trait: vector `[z_22E, z_22L, z_23E, z_23N, z_23L]`
- Single continuous: scalar `[z_culm]`

#### Step 5. Optimal Group Count (k)
- Test k=2, k=3
- Metrics: silhouette score, Calinski-Harabasz, Davies-Bouldin, BIC/AIC
- Rules:
  - n < 12 → prefer k=2
  - 3-group with a singleton → downgrade to k=2
  - Pick higher silhouette with interpretable split

#### Step 6. Clustering (GMM)
Gaussian Mixture Model — provides cluster labels + membership probabilities.

#### Step 7. Borderline Detection

| Max Probability | Confidence |
|-----------------|------------|
| >= 0.85 | High |
| 0.65 – 0.85 | Medium |
| < 0.65 | Borderline |

Stored fields: `assigned_group`, `assignment_probability`, `extremeness_score`, `borderline_flag`

#### Step 8. Auto-naming
Rule-based group names by trait:
- heading date: lower mean → "early", higher → "mid-late"
- culm length: lower → "short", higher → "tall"
- panicle number: "low" / "high"

#### Step 9. Result Storage

**Grouping summary:**

| Field | Example |
|-------|---------|
| trait_id | heading_date_integrated |
| method | GMM |
| n_groups | 2 |
| score_metric | silhouette |
| score_value | 0.71 |

**Per-cultivar assignment:**

| Field | Example |
|-------|---------|
| cultivar | Baegilmi |
| group_label | early |
| probability | 0.98 |
| confidence | high |
| borderline | false |

**Trait quality:**

| Field | Example |
|-------|---------|
| trait_id | PHS |
| missing_rate | 0.56 |
| usable | false |
| note | too many missing values |

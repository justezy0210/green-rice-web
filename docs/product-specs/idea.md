# Product Vision

> **이 리소스는 16개 한국 temperate japonica 품종에서 형질 그룹을 구분하는 후보 유전자 및 유전체 요소를 orthogroup, 변이, 그래프 기반 증거로 우선순위화해 제시하는 표현형 기반 후보 발견 데이터베이스이며, 후속 생물학적 검증의 출발점을 제공한다.**

Scope lock (2026-04-18): [scope.md](scope.md)

## Identity

표현형 차이에서 출발해 유전체 차이를 추적하는 **후보 발견(discovery)** 데이터베이스. 답을 확정하는 시스템이 아니라, **다음 실험/검증으로 보낼 후보를 좁혀주는** 시스템.

## One-line definition

16개 한국 벼 품종의 **표현형 패턴**을 기준으로 자동 그룹핑을 수행하고, 그 그룹 간 **유전체 차이(copy count, allele frequency, graph structure)**를 연결해서 **후속 검증이 필요한 후보 유전요소**를 우선순위화하는 웹 데이터베이스.

## Core concept

- 기존 DB: "이 유전자는 무엇인가?" — 유전자명·품종명으로 검색
- Green Rice DB: **"이 표현형을 가르는 후보 유전요소는 무엇인가?"** — 표현형에서 출발

중요: "가르는"이 아니라 **"가르는 후보"**. 인과 확정이 아닌 우선순위화.

### 기존 DB와의 차별점

| 기존 DB | Green Rice DB |
|---------|--------------|
| 유전자명/품종명 검색 → 정보 조회 | 표현형 선택 → 후보 유전요소 **우선순위화** |
| 단일 reference 기반 | 16 품종 (11 in pangenome) + IRGSP |
| 정적 annotation | GMM 제안 그룹 + multi-modal evidence |
| General 대상 | **한국 temperate japonica 특화** |

### Primary user

Trait biologist · QTL 후속 연구자 · upstream (pre-MAS) breeder.

Molecular breeder (KASP marker 개발자), GS/MAS 운영자, pangenome 방법론 연구자는 주 사용자 **아님**.

## User workflow

```
1. Dashboard
   표현형 분포 + 자동 그룹핑 (GMM proposed) 시각화
           ↓
2. Explore
   trait 선택 → 후보 OG 우선순위화
   - Mann-Whitney U + Cliff's delta (exploratory)
   - Functional category chart (LLM proposed)
   - Search / sort / filter
           ↓
3. OG Detail — 증거 수렴
   ├─ Gene Locations    cultivar별 gene 좌표 + cluster + same-chr presence
   ├─ Variants          cluster-derived region의 group별 AF + event-class
   └─ Pangenome Graph   Cactus alignment + annotation overlay
           ↓
4. Download
   후속 검증용 candidate/evidence table
```

## Data sources

| Layer | Source | Artifacts |
|-------|--------|-----------|
| Phenotype | 9 traits × 16 cultivars | `cultivars/{id}` |
| Proposed grouping | GMM per trait | `groupings/{traitId}` |
| Orthogroups | OrthoFinder | `orthofinder/v{N}/` |
| Differential | Mann-Whitney U | `orthogroup_diffs/v{N}/g{M}/` |
| Allele frequency | Cactus pangenome VCF | `og_allele_freq/v{N}/g{M}/` |
| Per-cluster region | halLiftover + vg chunk | `og_region_graph/v{N}_g{M}/`, `og_region_af/v{N}_g{M}/` |
| Functional annotation | IRGSP GFF + LLM | `og_categories.json` |

## What this DB CAN answer

- 어느 OG가 **후보**인가 (copy count diff 기준)
- 후보 locus에서 group별 AF 차이
- 후보 locus의 cluster-derived pangenome graph 구조
- Cluster별 cultivar annotation 분포
- 한국 temperate japonica panel 내부 비교

## What this DB CANNOT answer

- 이 후보가 **원인**인가
- 어느 cultivar가 진짜 gene을 가지지 않는가 (annotation 부재 ≠ gene 부재)
- 이 변이가 KASP / CAPS marker로 적합한가
- 이 결과가 16개 panel 밖에서도 성립하는가
- GMM 제안 그룹이 생물학적 실체인가

→ 이것들은 모두 **후속 실험/검증 영역**.

자세한 경계: [scope.md](scope.md)

## Next-step guidance (for users)

Green Rice DB가 후보를 제시하면, 사용자는 자기 랩에서:

- Reference CDS → 대상 cultivar assembly BLAST / minimap2
- ORF integrity inspection
- Promoter / upstream variant scan
- Expression validation (RNA-seq / qPCR)
- 더 넓은 panel에서 genotyping

## Scope boundaries (현재 MVP)

**포함**
- 11 cultivars (pangenome VCF 기준) + IRGSP
- Phenotype-based proposed grouping (k=2)
- Copy count / AF / pangenome graph 통합 뷰
- 후보 우선순위화

**미포함 / 의도적 제외 (scope.md 참조)**
- Marker/primer design
- Parent-pair workflow
- Validated PAV / pseudogene
- MAS / GS / GEBV
- Population-level causal inference

# Green Rice DB Presentation Outline

Last updated: 2026-04-27

## Presentation Goal

Green Rice DB를 단순한 웹사이트 소개가 아니라, 한국 temperate japonica
품종의 assembly 기반 pan-genome 정보를 연구자가 탐색할 수 있게 만든
데이터베이스 자원으로 설명한다.

발표의 핵심 메시지:

> Green Rice DB는 한국 벼 품종의 de novo assembly, gene annotation,
> orthogroup, structural variation, phenotype 정보를 연결하여 품종 간
> gene/SV 다양성과 형질 관련 후보를 탐색할 수 있게 만든 assembly-based
> pan-genome web resource이다.

## 1. Background And Problem

슬라이드 목적:

- 왜 이 DB가 필요한지 먼저 설명한다.
- 기존 분석 방식의 한계를 짚고, assembly 기반 pan-genome resource의 필요성을
  제시한다.

핵심 내용:

- 한국 temperate japonica 벼 품종은 re-sequencing 기반 데이터가 상대적으로
  많다.
- 그러나 품종별 de novo assembly, gene model, large structural variation,
  gene presence/absence를 통합적으로 볼 수 있는 resource는 부족하다.
- 단일 reference genome에 reads를 mapping하는 방식은 reference에 없는
  서열, 품종 특이 gene, 큰 SV를 놓칠 수 있다.
- 한국 벼 품종의 유전적 다양성을 품종 단위와 gene/SV 단위에서 탐색하려면
  assembly 기반 pan-genome DB가 필요하다.

발표 문장 예시:

> 기존 resequencing 중심 분석은 SNP 수준 비교에는 강하지만, 품종별 assembly에
> 존재하는 gene content 차이와 large SV를 해석하는 데 한계가 있습니다. Green
> Rice DB는 이 부분을 웹에서 탐색 가능한 형태로 제공하기 위해 만들었습니다.

## 2. Project Overview

슬라이드 목적:

- 프로젝트의 정체성과 현재 범위를 명확히 한다.
- 16 품종 frame과 현재 11 품종 graph/SV coverage를 혼동하지 않게 구분한다.

핵심 내용:

- Green Rice DB는 한국 temperate japonica 중심의 비교유전체 웹 DB이다.
- 전체 DB frame은 16 Korean rice cultivars를 대상으로 한다.
- 현재 주요 graph/SV 분석 coverage는 11 Korean japonica cultivars를 중심으로
  제공된다.
- 이 DB의 주된 탐색 단위는 phenotype이 아니라 entity이다.

Entity-centered 구조:

- Cultivar
- Gene
- Orthogroup
- Pangenome summary
- Structural variant
- Region
- Discovery candidate

주의할 표현:

- Discovery 결과는 validated causal variant가 아니다.
- Marker-ready result라고 말하지 않는다.
- 현재는 hypothesis-generating candidate evidence로 설명한다.

발표 문장 예시:

> 이 웹 DB는 trait-first association portal이라기보다, cultivar, gene,
> orthogroup, SV, region을 중심으로 한국 벼 pan-genome 정보를 탐색하는
> entity-centered database입니다.

## 3. Data Layers

슬라이드 목적:

- 어떤 원천 데이터와 파생 데이터가 웹 DB에 들어갔는지 한 장으로 보여준다.

데이터 layer:

| Layer | Content | Web Role |
| --- | --- | --- |
| Cultivar panel | Korean temperate japonica cultivars | 품종별 entry point |
| De novo assembly | per-cultivar genome assembly | reference bias를 줄인 기반 자원 |
| Gene annotation | per-cultivar gene models | gene search, gene model visualization |
| OrthoFinder | orthogroups, member genes | core/accessory/PAV 탐색 |
| Conservation tier | OG presence/copy pattern | OG 보존도 및 품종별 차이 요약 |
| Minigraph-Cactus | pangenome graph, SV events | structural variation catalog |
| Phenotype | 9 traits | trait group overlay |
| OG-SV overlap | OG와 SV의 genomic overlap | candidate prioritization evidence |

설명 포인트:

- Orthogroup은 품종 간 homologous gene set을 비교하기 위한 기본 단위이다.
- SV event는 graph 기반으로 정규화된 구조 변이 단위이다.
- Phenotype은 독립된 결론이 아니라 gene/SV pattern 해석을 돕는 overlay이다.

## 4. Web Database Design Concept

슬라이드 목적:

- 데이터를 그냥 업로드한 것이 아니라, 사용자가 던질 질문에 맞춰 페이지 구조를
  설계했다는 점을 설명한다.

사용자 질문과 대응 페이지:

| User Question | Page |
| --- | --- |
| 이 품종에는 어떤 유전체 자원이 있는가? | Cultivars |
| 특정 gene은 어디에 있고 어떤 annotation을 가지는가? | Genes |
| 이 gene은 어떤 orthogroup에 속하는가? | Gene detail, OG detail |
| 이 orthogroup은 모든 품종에 존재하는가? | Orthogroups |
| 품종별 copy number나 PAV 차이가 있는가? | OG detail |
| 어떤 SV가 어떤 품종에 존재하는가? | SV |
| SV가 gene model 주변 어디에 위치하는가? | Region |
| phenotype group 차이와 함께 보이는 OG/SV 후보가 있는가? | Discovery |

핵심 설계 원칙:

- 먼저 entity를 찾고, 필요한 경우 phenotype evidence를 overlay한다.
- raw count보다 사용자가 해석할 수 있는 pattern을 우선 보여준다.
- Discovery는 모든 overlap을 나열하는 곳이 아니라 review candidate를 검토하는
  공간이다.

## 5. How The Data Is Represented In The Website

슬라이드 목적:

- 구현 아이디어를 기술 스택이 아니라 데이터 표현 방식 중심으로 설명한다.

표현 방식:

1. Cultivar-centered view
   - 품종별 assembly, annotation, phenotype summary를 제공한다.
   - 사용자는 특정 품종에서 출발해 gene/region으로 이동할 수 있다.

2. Gene-centered view
   - gene ID 검색을 통해 gene model과 functional annotation을 확인한다.
   - 관련 OG와 주변 SV context를 연결한다.

3. Orthogroup-centered view
   - orthogroup별 member gene을 품종 단위로 보여준다.
   - core/accessory/PAV 성격과 trait evidence를 함께 확인한다.
   - phenotype group에 속한 cultivar badge를 member table에 표시한다.

4. SV-centered view
   - SV event catalog를 제공한다.
   - 어떤 품종이 carrier인지, trait group별 carrier pattern이 어떤지 보여준다.
   - 필요한 경우 region page로 이동해 gene model 주변 위치를 확인한다.

5. Region-centered view
   - 특정 품종, 염색체, 좌표 범위에서 gene model과 SV track을 함께 보여준다.
   - SV가 exon, intron, upstream, downstream 등 어느 primary impact category에
     가까운지 해석하는 기반을 제공한다.

6. Discovery view
   - OG와 SV가 phenotype contrast와 함께 나타나는 후보 locus를 review한다.
   - causal validation이 아니라 candidate prioritization으로 설명한다.

## 6. Main Page Walkthrough

슬라이드 목적:

- 실제 발표 시 데모 순서를 정한다.
- 기능 나열보다 하나의 연구 질문을 따라가게 만든다.

추천 use case:

> 초장 또는 출수기 같은 phenotype 차이와 관련될 수 있는 gene/SV 후보를 찾고
> 싶다.

데모 흐름:

1. Discovery에서 trait-associated review locus를 선택한다.
2. locus detail에서 어떤 trait context가 이 locus를 support하는지 확인한다.
3. SV patterns across groups에서 trait group별 carrier pattern을 본다.
4. 관련 SV detail로 이동해 carrier cultivar와 group pattern을 확인한다.
5. 연결된 OG detail로 이동해 품종별 member gene과 phenotype group badge를
   확인한다.
6. Region page에서 gene model 주변에 SV가 실제로 어디에 위치하는지 확인한다.

발표에서 강조할 점:

- 사용자는 Discovery에서 후보를 보고 끝나는 것이 아니라, SV, OG, gene,
  region으로 내려가 evidence를 직접 검토할 수 있다.
- 이것이 단순 table dump와 다른 점이다.

## 7. Suggested Slide Structure

1. Title
   - Green Rice DB: An Assembly-Based Pan-Genome Web Resource for Korean
     Temperate Japonica Rice

2. Background
   - Korean rice genomics has many resequencing datasets, but assembly-based
     comparative resources are limited.

3. Project Objective
   - Build a web database that connects cultivar assemblies, gene annotations,
     orthogroups, SVs, and phenotype overlays.

4. Data Overview
   - 16-cultivar DB frame
   - Current 11-cultivar graph/SV coverage
   - 9 phenotype traits

5. Analysis Layers
   - assembly → annotation → OrthoFinder → pangenome graph/SV → phenotype
     overlay → OG-SV candidate evidence

6. Information Architecture
   - Cultivars, Genes, Orthogroups, Pangenome, SV, Region, Discovery

7. Feature 1: Orthogroup And PAV Exploration
   - OG conservation, member genes, cultivar-level presence/copy pattern

8. Feature 2: Structural Variant Exploration
   - SV event catalog, carrier cultivars, trait group pattern, region context

9. Feature 3: Discovery Candidate Review
   - Candidate loci where OG/SV patterns and phenotype groups can be reviewed

10. Demo Scenario
    - Start from Discovery, then inspect SV, OG, gene, and region evidence.

11. Current Scope And Limitations
    - 11-cultivar SV coverage
    - Discovery is not causal validation
    - candidate evidence is hypothesis-generating

12. Future Directions
    - Complete 16-cultivar coverage
    - improve PAV/CNV classification
    - add external rice panel comparison
    - support marker design after validation-grade evidence is available

## 8. Visual Materials To Prepare

추천 화면 캡처:

- Home or Pangenome summary: database scale and resource overview
- Cultivar detail: cultivar-centered entry
- OG index/detail: orthogroup and PAV view
- SV index/detail: SV carrier pattern
- Region page: gene model and SV track together
- Discovery locus detail: trait-filtered candidate review

추천 도식:

```text
Cultivar assemblies
  -> Gene annotations
  -> Orthogroups / PAV
  -> Pangenome graph / SV
  -> Phenotype group overlay
  -> Discovery candidate review
```

## 9. Safe Terminology

Use:

- candidate
- review locus
- evidence layer
- carrier pattern
- phenotype group overlay
- hypothesis-generating
- assembly-based comparative resource

Avoid:

- causal variant
- validated marker
- marker-ready
- breeding-ready
- representative of all Korean rice
- definitive trait gene

## 10. Closing Message

마무리 문장 예시:

> Green Rice DB는 한국 벼 품종의 assembly 기반 pan-genome 정보를 웹에서
> 탐색할 수 있도록 구성한 resource입니다. 사용자는 cultivar, gene,
> orthogroup, SV, region을 오가며 품종 간 유전적 다양성을 확인하고,
> phenotype group과 함께 나타나는 후보 gene/SV evidence를 검토할 수 있습니다.


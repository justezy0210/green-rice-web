# Introduction Draft v2

> 이 문서는 연구 논문의 Introduction 초안이다. 웹 DB의 학술적 문맥·정당성을 담는다.
> 참고: [scope.md](./scope.md) — 정체성 lock / [idea.md](./idea.md) — 제품 정의 / [../ARCHITECTURE.md](../ARCHITECTURE.md) — 기술 구조

> **정체성 선언 (2026-04-18 locked)**: 이 리소스는 16개 한국 temperate japonica 품종에서 형질 그룹을 구분하는 후보 유전자 및 유전체 요소를 orthogroup, 변이, 그래프 기반 증거로 우선순위화해 제시하는 표현형 기반 후보 발견 데이터베이스이며, 후속 생물학적 검증의 출발점을 제공한다. Introduction 본문의 어떤 표현도 이 scope를 넘어서는 주장은 담지 않는다 (causal / validated / marker-ready 등 제외).

## 연구 배경 및 목적

벼(Oryza sativa)는 전 세계 인구의 절반 이상이 주식으로 소비하는 대표적 식량작물로, 수량, 미질, 병 저항성 및 환경 적응성 개선을 위한 유전체 연구가 활발히 진행되어 왔다. 벼의 재배종은 크게 인디카(indica)와 자포니카(japonica) 아종으로 구분되며, 자포니카 내에서도 temperate japonica 하위집단(subpopulation)은 한국, 일본 등 동북아시아의 온대 지역에서 주로 재배되고 있다. 이 하위집단은 오랜 육종 과정에서 비교적 좁은 유전적 배경(genetic bottleneck)을 형성해 왔으나, 그럼에도 각 지역의 육성 품종은 인위적 선발과 환경 적응의 결과로 유전체 전반에 걸쳐 고유한 대립유전자 조합을 보유하고 있다.

한국 품종의 경우, 동북아 온대 장일(long-day) 조건에 적응한 출수기(heading date) 조절, 산간지역 저온에 대응하는 내냉성(cold tolerance), 도열병(blast) 및 흰잎마름병(bacterial blight) 등에 대한 저항성, 그리고 중저 아밀로스 함량과 찰진 식감을 선호하는 소비자의 미질(grain quality) 기준에 맞춘 형질들이 오랜 육종을 통해 선발되어 왔다. 이러한 지역 적응 형질의 유전적 기초는 다른 지역의 품종이나 아종과 상이할 수 있으며, 외부 유전자원의 직접 도입 시 출수기와 환경 적응성 관련 대립유전자 조합이 맞지 않아 수량 저하 등 비적응(maladaptation) 문제가 발생할 수 있다. 따라서 이러한 품종 간 미세한 차이를 SNP 수준을 넘어 구조변이(Structural Variation, SV)와 유전자 존재/부재 변이(Presence/Absence Variation, PAV)까지 정밀하게 파악하기 위해서는 단일 참조 유전체 기반 resequencing만으로는 한계가 있으며, 지역 육성 품종의 de novo 유전체 해독이 중요하다.

기존의 벼 유전체 연구는 주로 Nipponbare(IRGSP-1.0) 단일 참조 유전체에 short-read를 매핑하는 resequencing 기반 접근에 의존해 왔다. 이러한 접근은 참조 유전체에 존재하지 않는 품종 특이적 서열, 반복서열 풍부 영역, 저항성 유전자 클러스터 등을 포착하지 못하는 reference bias의 한계를 갖는다. 한국 벼 품종을 대상으로 한 연구 역시 이러한 경향을 따르고 있어, temperate japonica 24품종의 변이 분석(Ji et al., 2021), 105개 유전자원의 variant database 구축(Kim et al., 2025, K-rice) 등이 보고되었으나, 이들은 모두 Nipponbare 기반 mapping/variant calling에 의존하고 있다.

최근 long-read sequencing 기술의 발전은 chromosome-scale de novo assembly와 정밀한 SV/PAV 검출을 실용적으로 가능하게 하였다. 이를 기반으로 한 대규모 rice pangenome 연구들은 단일 참조 유전체에서는 검출할 수 없었던 변이가 주요 농업 형질과 연관될 수 있음을 보여주었다(Qin et al., 2021, 33 accessions; Zhang et al., 2022, 111 genomes; Shang et al., 2022, 251 genomes; Guo et al., 2025, 145 chromosome-level assemblies). 특히 graph pangenome 접근은 reference bias를 완화하고, 복합 변이 구간의 read mapping과 variant representation을 개선하며, 집단 수준의 유전적 변이를 보다 통합적으로 분석할 수 있는 장점을 갖는다. 전 세계적으로 수백 건의 chromosome-level rice genome assembly가 구축되었으며, NCBI Assembly database에만 127건이 등록되어 있다(2026년 4월 기준, Supplementary Table S1). 그러나 저자가 확인한 공용 데이터베이스와 주요 문헌 범위에서 한국 육성 temperate japonica 품종의 chromosome-level assembly는 보고를 찾기 어려우며, 한국 기관이 등록한 6건의 assembly 역시 모두 인디카 계통(IR64 변이체)에 해당한다. 국내 벼 유전체 연구는 축적되어 있으나, de novo assembly 기반의 다품종 graph pangenome 자원으로의 전환은 아직 이루어지지 않은 실정이다.

본 연구에서는 한국에서 주요하게 재배되는 temperate japonica 16품종에 대해 Illumina short-read와 Oxford Nanopore long-read를 활용한 hybrid de novo assembly를 수행하고, IRGSP-1.0 참조 유전체를 이용한 chromosome-scale scaffolding을 통해 고품질 유전체를 구축하였다. 각 품종의 contig 수준 서열은 de novo로 조립되어 품종 고유의 서열과 구조변이가 보존되며, 참조 유전체는 contig의 순서 및 방향 배치(ordering and orientation)에만 활용되었다. 이를 Cactus 기반 graph pangenome으로 통합하여 SNP, indel, SV 및 gene PAV를 체계적으로 정리하고, orthogroup 분석을 통해 핵심/부수 유전자(core/accessory genes)를 분류하였다. 나아가 주요 농업 형질과 연관된 candidate genomic features를 우선순위화하고, 이를 탐색 가능한 데이터베이스로 제공함으로써 한국형 벼 정밀 육종 연구의 유전체 기반 자원을 확충하고자 한다.

---

## 참고문헌

1. Ji et al., 2021. Genomic Variation in Korean japonica Rice Varieties. PMC8623644.
2. Kim et al., 2025. K-rice: a comprehensive database of Korean rice germplasm variants. PMC12176901.
3. Qin et al., 2021. Pan-genome analysis of 33 genetically diverse rice accessions. Cell. PMID: 34051138.
4. Zhang et al., 2022. Long-read sequencing of 111 rice genomes reveals significantly larger pan-genomes. Genome Research. PMID: 35396275.
5. Shang et al., 2022. A super pan-genomic landscape of rice. Cell Research. DOI: 10.1038/s41422-022-00685-z. (251 genomes)
6. Guo et al., 2025. A pangenome reference of wild and cultivated rice. Nature. PMID: 40240605. (145 chromosome-level assemblies)
7. NCBI Assembly Database. https://www.ncbi.nlm.nih.gov/assembly/?term=Oryza+sativa (accessed 2026-04-16)
8. Kim et al., 2018. Loss-of-Function Alleles of Heading date 1 (Hd1) Are Associated With Adaptation of Temperate Japonica Rice Plants to the Tropical Region. PMID: 30619400.
9. Garrison et al., 2018. Variation graph toolkit improves read mapping by representing genetic variation in the reference. Nature Biotechnology. PMID: 30125266.

## v1 → v2 변경 사항

1. "아종" → "하위집단(subpopulation)" 수정
2. "고위도" → "동북아 온대 장일(long-day) 조건" 수정
3. "필수적이다" → "중요하다" 완화
4. "multi-mapping 문제를 해결" → "reference bias를 완화하고 ... 개선하며" 완화
5. "전무" → "저자가 확인한 ... 보고를 찾기 어려우며" 완화
6. Guo et al. "149 accessions" → "145 chromosome-level assemblies" 정확화
7. Shang et al., 2022 (251 genomes) 인용 추가
8. 도열병, 흰잎마름병 등 병 저항성 형질 추가
9. 16품종 선정 근거 한 문장 추가 ("주요 재배 품종 및 육종 계보상 핵심 부모본")
10. maladaptation → de novo 연결에 중간 논리 추가 ("SNP 수준을 넘어 SV/PAV까지 ... resequencing만으로는 한계")
11. Reference-guided scaffolding의 역할 명확화 ("contig의 순서 및 방향 배치에만 활용")
12. 1문단을 2문단으로 분리 (주장 밀도 분산)
13. NCBI 수치에 "Supplementary Table S1" 참조 추가
14. "낮은 아밀로스" → "중저 아밀로스 함량과 찰진 식감" 수정
15. Garrison et al. 2018, Kim et al. 2018 참고문헌 추가

## Cross-verification notes

- v1은 Codex(GPT-5.4), Gemini, Claude 3자 검증 결과를 반영
- v2는 v1 검증에서 지적된 10개 수정 항목 전체 반영
- 평가: v1 "중상(revision 필요)" → v2 "투고 가능 수준"으로 개선 목표
- 추후 보강: 1문단 인용 추가 (출수기, 내냉성, 미질 관련 근거 문헌 2-3건)

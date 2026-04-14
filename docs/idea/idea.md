사용자가 품종명이나 유전자명만 검색하는 DB가 아니라, 표현형 차이에서 출발해서 유전체 차이를 추적할 수 있는 DB를 만드는 것.
예를 들어:
- "조생종과 만생종을 가르는 후보 유전자는?"
- "특정 품종의 heading date 관련 유전자는 다른 품종에서 어떤 haplotype을 가지는가?"
- "이 표현형과 관련된 유전자가 PAV, SV, copy number 변화, orthogroup 차이와 연결되는가?"
- "특정 유전자 주변 구조가 품종마다 어떻게 다른가?"

정체성
> 16개 한국 벼 품종의 표현형과 pangenome variation을 연결해 탐색하는 웹 데이터베이스

phenotype + assembly + annotation + cactus pangenome + orthofinder를 모두 활용 가능

## 기능 아이디어
### 아이디어 1. 표현형 중심 탐색
사용자가 먼저 phenotype을 선택

그 다음 사용자가:
- 품종 그룹을 나누고
- 그룹 간 유전체 정보를 비교
하게 만드는 것.

표현형을 선택 -> 확연하게 차이나는 그룹을 짓게 함.
- 해당 phyenotype 그룹별 품종 분호
- 관련 candidate gene 목록
- 그룹 간 allele frequency 차이
- PAV/SV hotspot
- orthogroup 차이
- pangenome sequencetubemap

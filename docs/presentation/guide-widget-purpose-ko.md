# Guide Widget 목적과 사례별 기대 결과

Last updated: 2026-04-29

## 1. Guide Widget의 목적

Guide Widget은 Green Rice DB를 처음 사용하는 사람이 “어디서부터 봐야 하는지”를 빠르게 이해하도록 돕기 위한 사용 흐름 안내 도구이다.

Green Rice DB는 cultivar, gene, orthogroup, SV, region, discovery candidate처럼 여러 entity가 서로 연결된 구조이다. 이 구조는 연구자에게는 강점이지만, 처음 사용하는 사람에게는 진입 장벽이 될 수 있다. 따라서 Guide Widget은 단순한 버튼 모음이 아니라, 실제 연구자가 가질 법한 질문을 기준으로 “무엇을 검색하고, 무엇을 선택하고, 어떤 정보를 확인해야 하는지”를 단계별로 제시한다.

핵심 목적은 다음과 같다.

- 사용자가 DB의 주요 탐색 흐름을 빠르게 이해하게 한다.
- 단순 페이지 소개가 아니라, 연구 질문에서 출발하는 실제 사용 시나리오를 제공한다.
- Green Rice DB가 단일 결과표가 아니라 phenotype, gene family, SV, region context를 연결해서 후보를 검토하는 DB임을 보여준다.
- 사용자가 “이 DB에서 내 trait/gene/cultivar 질문도 이런 식으로 던질 수 있겠다”고 느끼게 한다.

## 2. Guide Widget의 기본 원칙

Guide Widget은 causal variant를 확정해 주는 기능이 아니다. 각 사례는 hypothesis-generating workflow, 즉 후보를 좁히고 검토 우선순위를 세우기 위한 예시이다.

따라서 각 사례는 다음 구조로 작성되어야 한다.

|구성|의미|
|---|---|
|Research question|사용자가 실제로 가질 법한 질문|
|Workflow|무엇을 검색하고, 무엇을 선택하고, 어디를 확인할지|
|Check|해당 단계에서 눈여겨볼 정보|
|You get|그 행동을 통해 얻는 해석 또는 정보|
|Expected takeaway|이 사례가 Green Rice DB의 어떤 가치를 보여주는지|

Guide 안에는 직접 이동 링크를 넣지 않는다. 사용자가 버튼만 누르는 것이 아니라, 실제 UI에서 Browse, 검색창, trait filter, row 선택 등을 따라가며 DB 구조를 익히는 것이 목적이기 때문이다.

## 3. 사례 1: Pangenome overview에서 전체 DB 규모 파악하기

### 목적

이 사례는 사용자가 개별 gene, SV, locus로 들어가기 전에 Green Rice DB의 전체 panel 규모와 데이터 범위를 이해하도록 돕기 위한 흐름이다.

Pangenome Summary는 후보를 확정하는 페이지가 아니라, 현재 DB가 어떤 cultivar panel, orthogroup conservation tier, functional category, SV release를 가지고 있는지 파악하는 orientation layer이다.

### 사용 흐름

1. Browse menu에서 Pangenome을 선택한다.
2. panel cultivars, graph coverage, total orthogroups, SV event count를 확인한다.
3. Orthogroup Conservation에서 core, variable, rare, private tier의 규모를 비교한다.
4. Functional Pangenome과 SV Release 영역을 보고 다음에 어떤 entity로 들어갈지 결정한다.

### 사용자가 확인하는 정보

- 현재 DB의 cultivar panel과 SV coverage 범위
- 전체 orthogroup 수와 conservation tier 구성
- core/accessory-like gene family catalog의 전체 규모
- functional category와 SV type count

### 사용자가 얻는 결과

사용자는 Green Rice DB가 어떤 데이터 범위를 가진 DB인지 먼저 파악한다. 이후 gene, orthogroup, SV, discovery candidate로 들어갈 때 각 결과가 전체 pangenome frame 안에서 어떤 위치를 갖는지 이해할 수 있다.

이 사례는 개별 후보를 바로 찾는 흐름은 아니지만, 처음 사용하는 사용자에게 DB의 scale과 한계를 알려주는 시작점으로 중요하다.

## 4. 사례 2: Late-heading cultivar에서 chr06 region context 보기

### 목적

이 사례는 사용자가 특정 품종 이름을 알고 있을 때, 그 품종에서 genome-level 정보를 어떻게 확인하는지 보여주기 위한 흐름이다.

예시 품종은 Samgwang이다. Samgwang을 단순히 품종 정보로만 보는 것이 아니라, late-heading phenotype context를 확인한 뒤 chr06 heading-date 관련 region으로 들어가 gene model과 SV context를 함께 보는 구조이다.

### 사용 흐름

1. Browse menu에서 Cultivars를 선택한다.
2. Samgwang을 클릭한다.
3. phenotype profile과 genome summary를 먼저 확인한다.
4. Chromosomes 영역으로 내려간다.
5. chr06을 선택해 region view로 들어간다.
6. chr06:10.0-10.65 Mb 근처 region track에서 gene model과 cultivar-carried SV를 함께 본다.

### 사용자가 확인하는 정보

- Samgwang이 panel 평균과 비교해 어떤 phenotype profile을 갖는지
- cultivar page에서 assembly-level genome view로 어떻게 진입하는지
- 특정 region 안에서 gene model과 SV가 어떤 위치 관계를 갖는지
- 품종 중심 질문이 region-level genome context로 어떻게 이어지는지

### 사용자가 얻는 결과

사용자는 “품종 하나를 선택하면 phenotype, genome summary, chromosome, region track으로 이어질 수 있다”는 것을 이해한다. 즉 Green Rice DB가 단순한 품종 목록이 아니라, 품종별 assembly context를 탐색하는 입구라는 점을 알 수 있다.

이 사례는 OG ID나 SV ID를 모르는 사용자에게 특히 중요하다.

## 5. 사례 3: Gene/function에서 phenotype-group copy pattern 보기

### 목적

이 사례는 사용자가 gene ID를 알고 있을 때와 생물학적 기능 키워드만 알고 있을 때를 함께 다룬다.

Gene page는 특정 gene ID에서 annotation, OG assignment, trait-hit badge, linked SV badge로 이어지는 흐름을 제공한다. Orthogroups page는 gene ID를 모르는 사용자가 `bacterial blight` 같은 기능 키워드로 gene family 후보를 찾는 흐름을 제공한다.

### 사용 흐름

1. gene ID를 알고 있다면 Browse menu에서 Genes를 열고 해당 gene ID를 검색한다.
2. 검색 결과에서 annotation, OG assignment, trait-hit badge, linked SV badge를 확인한다.
3. 기능 키워드로 시작하고 싶다면 Browse menu에서 Orthogroups를 연다.
4. 검색창에 `bacterial blight`를 입력한다.
5. Trait evidence에서 Bacterial Leaf Blight를 선택한다.
6. 검색 결과 중 OG0000297을 연다.
7. Orthogroup members 표에서 품종별 copy count와 phenotype group badge를 비교한다.
8. 필요하면 관심 품종의 member gene을 열어 gene model과 linked SV context를 확인한다.

### 사용자가 확인하는 정보

- 특정 gene ID가 어느 cultivar에 속하는지
- 해당 gene이 어떤 orthogroup에 속하는지
- gene 검색 결과에서 trait-hit 또는 SV overlap 정보가 붙는지
- 기능 주석이 bacterial blight 또는 resistance와 연결되는 orthogroup
- 해당 OG가 Bacterial Leaf Blight trait evidence에 포함되는지
- resistant/susceptible group 사이에 copy count 차이가 있는지
- 특정 member gene의 annotation, gene model, nearby SV context

### 사용자가 얻는 결과

사용자는 gene ID에서 시작하든 기능 키워드에서 시작하든, gene-level 정보와 orthogroup-level pattern을 연결해서 볼 수 있다. 이 사례의 장점은 annotation, orthogroup, phenotype group, copy pattern, linked SV context가 하나의 흐름으로 연결된다는 점이다.

다만 이 결과는 bacterial blight resistance를 증명하는 것이 아니다. “resistance-like annotation과 phenotype-group copy pattern이 함께 보이는 후보 OG”로 해석해야 한다.

## 6. 사례 4: Early-heading cultivar group에서 group-specific SV 찾기

### 목적

이 사례는 SV browser가 단순히 SV 목록을 보여주는 페이지가 아니라, 사용자가 직접 cultivar group을 정의하고 그 group에 특이적인 SV pattern을 찾을 수 있음을 보여준다.

예시는 heading date이다. early-heading cultivars를 선택하고, 이 그룹이 모두 가지고 late-heading group에는 없는 SV를 찾는 흐름이다.

### 사용 흐름

1. Browse menu에서 Structural variants를 연다.
2. early-heading group에 해당하는 품종을 선택한다.
3. 예시로 Baegilmi, Jopyeong, Jungmo1024, Namil, Pyeongwon을 선택한다.
4. mode를 Only selected로 유지한다.
5. event count가 어떻게 줄어드는지 확인한다.
6. 검색창에 EV0007248을 입력한다.
7. 해당 SV row를 열어 carrier cultivars, coordinate, SV type, region context를 확인한다.

### 사용자가 확인하는 정보

- 선택한 cultivar group이 공유하는 SV 목록
- 선택하지 않은 품종에는 없는 strict group-specific SV인지
- EV0007248의 carrier pattern
- SV의 위치와 type
- SV가 어떤 region context와 연결되는지

### 사용자가 얻는 결과

사용자는 phenotype group을 직접 정의하고, 그 그룹과 일치하는 SV carrier pattern을 찾을 수 있다. 이 사례는 “SV page가 단순한 variant catalog가 아니라 phenotype-aware filtering 도구로 작동한다”는 점을 보여준다.

다만 EV0007248이 heading date causal variant라는 뜻은 아니다. 이 SV는 early/late contrast와 잘 맞는 후보 SV로 보고, 추가 검증이 필요한 candidate evidence로 해석해야 한다.

## 7. 사례 5: Culm length 후보가 chr11 review locus에서 함께 갈리는지 확인하기

### 목적

이 사례는 Discovery page의 존재 이유를 설명하는 핵심 시나리오이다.

Discovery는 하나의 gene이나 하나의 SV를 정답처럼 보여주는 페이지가 아니다. 여러 OG/SV evidence가 특정 genomic window에 모일 때, 이를 review locus로 묶어서 사용자가 block-level로 검토할 수 있도록 만든 페이지이다.

대표 사례는 `culm_length` trait의 `OG0039795`와 `EV0016290`이다. 이 사례에서는 OG presence와 SV carrier pattern이 모두 tall/short group에서 완전히 갈라진다.

### 사용 흐름

1. Discovery page를 연다.
2. shared chr11 development locus row를 선택한다.
3. detail page에서 Culm Length trait을 선택한다.
4. SV patterns across groups가 Culm Length 중심으로 정리되는지 확인한다.
5. `EV0016290` SV pattern과 `OG0039795` OG record를 확인한다.
6. SV detail, OG member pattern, gene model, region track을 서로 비교한다.

### 사용자가 확인하는 정보

- Culm Length 관련 evidence가 chr11 review locus 안에서 어떻게 정리되는지
- trait filter를 적용했을 때 SV pattern과 related records가 어떻게 좁혀지는지
- `OG0039795`가 tall group에서 100% present, short group에서 0% present로 나타나는지
- `EV0016290`이 tall group에서 8/8 ALT, short group에서 0/3 ALT로 나타나는지
- block-level 후보 locus에서 어떤 개별 SV/OG를 더 검토할지

### 사용자가 얻는 결과

사용자는 Discovery가 “정답 gene 목록”이 아니라 “후보 locus review 공간”이라는 점을 이해한다. 이 사례에서는 OG presence와 SV carrier pattern이 같은 phenotype contrast 방향으로 완전히 갈리므로, 후보 locus를 우선 검토할 이유가 분명해진다.

다만 이 사례도 causal proof가 아니다. `OG0039795`와 `EV0016290`은 11개 품종 panel에서 관찰된 강한 exploratory candidate evidence이며, 후속 검증이 필요한 후보로 설명해야 한다.

## 8. 다섯 가지 사례가 함께 보여주는 Green Rice DB의 가치

Guide Widget의 다섯 가지 사례는 서로 다른 시작점을 가진 사용자를 가정한다.

|사용자 시작점|대표 질문|사용 흐름|얻는 정보|
|---|---|---|---|
|Pangenome overview|이 DB의 전체 규모와 범위는 무엇인가?|Pangenome → conservation tier → functional/SV summary|panel-level pangenome catalog와 DB scope|
|Cultivar|이 품종의 genome context는 어떤가?|Cultivar → Chromosome → Region|품종 phenotype과 assembly-level gene/SV context|
|Gene/Function|이 gene 또는 기능과 관련된 gene family가 있는가?|Genes search 또는 Orthogroups search → OG detail|gene annotation, OG assignment, phenotype group, copy pattern|
|SV carrier group|특정 phenotype group이 공유하는 SV가 있는가?|SV browser → cultivar selection → SV detail|group-specific SV carrier pattern|
|Trait-linked discovery|trait signal이 특정 locus에 모이는가?|Discovery → locus detail → SV/OG/region drilldown|block-level candidate locus evidence|

이 다섯 흐름을 통해 사용자는 Green Rice DB가 다음과 같은 질문에 답할 수 있음을 알게 된다.

- 전체 pangenome catalog의 규모와 범위가 무엇인지 확인할 수 있는가?
- 특정 품종에서 genome context를 어떻게 볼 수 있는가?
- gene ID 또는 기능 키워드로 candidate gene family를 찾을 수 있는가?
- phenotype group에 맞는 SV carrier pattern을 찾을 수 있는가?
- 여러 gene/SV signal이 하나의 genomic block에 모이는지 검토할 수 있는가?

## 9. 발표 또는 데모에서 강조할 문장

Guide Widget은 Green Rice DB를 “사용자가 따라 할 수 있는 연구 질문”으로 소개하기 위한 장치이다.

발표에서는 다음처럼 설명할 수 있다.

> Green Rice DB는 단순히 gene, SV, phenotype table을 따로 보여주는 DB가 아닙니다. 사용자는 pangenome overview, cultivar, gene/function, SV carrier group, trait-linked discovery locus 중 어떤 질문에서 시작하더라도, 관련 gene family, structural variant, phenotype group, region context로 이어서 검토할 수 있습니다.

또한 다음 문장은 반드시 같이 말하는 것이 좋다.

> 이 DB는 causal variant를 확정하는 도구가 아니라, assembly-level pan-genome 정보를 바탕으로 검토할 후보 locus와 후보 gene/SV를 우선순위화하는 hypothesis-generating resource입니다.

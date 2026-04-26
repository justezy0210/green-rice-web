> **Status: Methodology draft (2026-04-21).**
> 완본 기준 16-cultivar 분석 설계. 현 MVP는 funannotate 완료 11 품종의 interim Cactus pangenome / OrthoFinder 기반.
> **현 MVP에서 이미 실행 가능:** 1–2단계 (표현형 그룹 · OG matrix), 5단계 중 Group specificity / Functional relevance / Orthogroup pattern.
> **선결 precompute 필요:** 3단계 (SV genotype matrix), 4단계 (OG × SV intersect). VCF 원본은 있음 (`green-rice-pg.vcf.gz`, 11 샘플).
> **외부 데이터 연동 필요:** Known QTL overlap.
> **부분적으로 가능:** Synteny support (cluster-local halLiftover 있음, genome-wide 미구현), Expression support (bulk RNA-seq 도착 시 binary expression까지).
> 아래 Case 예시는 **현 데이터에서 확인된 사례가 아니라 분석 완성 시 어떤 패턴을 잡을지 보여주는 교과서적 시나리오**이다.
> scope.md의 validated PAV / causal / marker-ready 금지 원칙은 그대로 적용된다.

---

### 1. Orthogroup은 왜 분석하는가?
> 여러 genome에 있는 유전자들을 진화적으로 대응되는 유전자군으로 묶는 단위.
> "분석 대상 종들의 공통조상에 있던 하나의 유전자에서 유래한 유전자들의 집합"

- 모든 품종에 공통인 유전자는?: Core orthogroup
- 일부 품종에만 있는 유전자는?: accessory / dispensable orthogroup
- 특정 표현형 그룹에만 있는 유전자는?: group-specific orthogroup
- 특정 그룹에서 copy number가 증가한 유전자군은? orthogroup copy number variation
- 표현형 차이와 관련될 가능성이 있는 기능은?: GO, KEGG, domain enrichment

### 2. Pangenome의 Structural variation은 왜 분석하는가?
> SV는 insertion, deletion, CNV, inversion, translocation처럼 큰 구조적 변이를 의미한다.

1. 어떤 Orthogroup이 저항성 그룹에만 존재한다면, 그 유전자는 실제로 특정 그룹의 genome에만 있는 insertion block 안에 있을 수 있다.
2. 유전자는 모든 품종에 있어도 표현형 차이는 SV에서 올 수 있다. 모든 품종이 같은 orthogroup을 가지고 있어도, 특정 그룹에서 promoter 2kb upstream에 TE insertion이 있거나, enhancer/유사 조절영역이 결실되어 expression이 달라질 수 있다. 이 경우 orthogroup presence/absence만 보면 차이가 없어 보이지만, SV 분석에서는 phenotype-associated regulatory variant를 찾을 수 있다.
3. Copy number와 inversion 같은 변이는 gene-level 분석만으로는 불완전하다. > 특정 orthogroup이 한 그룹에서는 1 copy, 다른 그룹에서는 3 copy라면 이 CNV 또는 tandem duplication의 결과일 수 있다. 또 inversion은 gene presence/absence를 바꾸지 않아도 linkage block, recombination suppression, haplotype differentiation을 만들 수 있다.

### 3. 이들은 따로 해석해야 하는가? 연결해서 해석하려면 어떻게 해야 하는가?
"분석은 따로, 해석은 연결"
```
표현형 그룹 차이
        ↓
그룹 특이 SV 또는 그룹 특이 Orthogroup
        ↓
SV가 포함하거나 영향을 주는 gene/orthogroup
        ↓
기능 annotation / pathway / expression / QTL 정보
        ↓
candidate mechanism
```

> **아래 Case 1–4는 illustrative scenarios이다 — 현 데이터에서 확인된 사례가 아니라, 분석이 완성됐을 때 어떤 패턴을 candidate로 잡을 것인지 보여주는 교과서적 예시.**
> 실제 후보를 기술할 때는 "observed along with" / "candidate" / "proposed" 프레이징만 허용되며 (scope.md), mechanism·causal 언어는 금지.

#### Case 1. 특정 Orthogroup이 표현형 그룹에만 존재하고, 그 Orthogroup이 특정 insertion SV 안에 있음
```
저항성 그룹에만 OG001234 존재
OG001234 = NLR gene
OG001234는 저항성 그룹 특이 35 kb insertion block 안에 위치
감수성 그룹에는 해당 insertion block 부재
```
> 저항성 그룹 특이 insertion이 NLR orthogroup을 포함하고 있으며, 이 gene-content difference가 저항성 표현형과 관련될 가능성이 있다.

#### Case 2. Orthogroup은 두 그룹 모두에 있지만, 특정 그룹에서 CNV가 있음
```
OG000567 = transporter gene family
고함량 그룹: 3–5 copies
저함량 그룹: 1 copy
SV 분석 결과 tandem duplication / CNV region 확인
```
> 표현형 차이는 유전자의 존재/부재가 아니라 copy number 차이와 dosage effect에 의해 발생했을 가능성이 있다.

#### Case 3. Orthogroup은 모든 품종에 있지만, promoter 또는 upstream SV가 그룹 특이적임
```
OG000890 = flowering-time gene
16개 품종 모두 gene present
조생 그룹에서만 1.2 kb promoter deletion 존재
```
> 유전자 존재/부재가 아니라 regulatory SV가 발현 조절을 바꾸어 표현형 차이를 만들었을 가능성이 있다.

#### Case 4. Inversion이 특정 표현형 그룹에 고정되어 있고, 그 안에 후보 Orthogroup들이 있음
```
내염성 그룹 8개 품종 중 7개에서 chrX 4 Mb inversion
감수성 그룹에서는 0개 또는 1개
inversion 내부에 stress-response orthogroup cluster 존재
```
> 이 inversion이 직접 유전자를 파괴하지 않더라도, 특정 haplotype block을 유지하거나 recombination을 억제하여 표현형 관련 유전자 조합을 보존했을 가능성이 있다.

- 벼 pangenome 연구에서도 syntelog group, gene PAV, haplotype composition을 함께 분석하여 subspecies divergence와 domestication 관련 region을 해석한 사례가 있습니다. 즉, 유전자군만 보거나 SV만 보는 것보다, synteny/haplotype/structural context를 같이 보는 방식이 벼에서는 특히 유용합니다.

## 실제 분석 설계 제안

> **Sample size 주의.** 완본 기준 16 품종, 현 MVP 기준 11 품종이다. 어느 쪽이든 GWAS 수준의 통계 검정은 아니며 **candidate discovery**로 해석해야 한다. indica/japonica는 모두 temperate japonica로 고정되어 있지만, landrace vs improved, 지리·육종 계보의 population substructure는 여전히 confound를 만들 수 있으므로 pre-analysis QC (group balance, kinship / PCA)가 필요하다. Group A/B 분할의 통계 신뢰도는 반드시 permutation-based null 또는 FDR로 calibration해야 한다.

16개 품종(완본) 기준 다음 순서가 적절합니다.

### 1단계. 표현형 그룹 정의

예를 들어 다음처럼 명확히 나눕니다.

Group A: 표현형 있음 / 저항성 / 고함량 / 조생 / 녹색  
Group B: 표현형 없음 / 감수성 / 저함량 / 만생 / 비녹색

주의할 점은 샘플 수가 작기 때문에(완본 16, 현 MVP 11), "GWAS 수준의 강한 통계 검정"보다는 **candidate discovery**로 해석하는 것이 안전합니다. 본 리소스는 모두 temperate japonica로 고정되어 있지만, landrace vs improved, 지리·육종 계보가 표현형 그룹 분할과 겹칠 경우 phenotype-like 신호가 실제로는 population substructure 신호일 수 있습니다. Group A/B 분할마다 kinship / PCA QC, permutation-based null 또는 FDR calibration이 선행되어야 합니다.

---

### 2단계. Orthogroup matrix 생성

각 orthogroup에 대해 다음 값을 만듭니다.

presence/absence: 0 or 1  
copy number: 0, 1, 2, 3...  
group frequency: Group A에서 몇 개 품종에 존재하는가  
group frequency: Group B에서 몇 개 품종에 존재하는가

예:

OG001234  
Group A: 8/8 present  
Group B: 0/8 present  
Function: NB-ARC domain disease resistance protein

이런 Orthogroup은 강한 group-specific candidate입니다.

---

### 3단계. SV genotype matrix 생성

> **현 precompute 상태:** 3단계는 아직 precompute되지 않음. 원본은 `results/cactus/gr-pg/green-rice-pg.vcf.gz` (vg deconstruct → vcfbub clip → bcftools concat, 현재 11 샘플). `vg deconstruct` 출력은 같은 SV event가 여러 row로 분할될 수 있으므로, matrix 단위는 **event 단위 정규화 이후**에 결정해야 한다 (`vcfwave` / `bcftools norm -m-` / top-level snarl `LV=0` 필터 등). Inversion·translocation은 vg deconstruct가 equivalent path로 풀지 못하므로 별도 caller가 필요하다.
> **SV 정의:** REF/ALT 길이 차 ≥ 50 bp를 SV-like로 태깅. Type (INS / DEL / CNV / INV) 주석은 allele 길이·AT traversal 기반으로 후처리 추론해야 한다 — vg deconstruct 원본에는 없음.

각 SV에 대해서도 같은 방식으로 matrix를 만듭니다.

SV ID | Type | Chr | Start | End | Group A freq | Group B freq | Nearby genes  
SV001 | INS  | 3   | ...   | ... | 8/8          | 0/8          | OG001234  
SV002 | DEL  | 5   | ...   | ... | 1/8          | 7/8          | OG000456  
SV003 | INV  | 6   | ...   | ... | 6/8          | 0/8          | multiple genes

여기서 중요한 것은 SV를 단순히 개수로 세는 것이 아니라, **어떤 SV가 표현형 그룹 간 frequency difference를 보이는지**입니다.

---

### 4단계. Orthogroup과 SV를 intersect

> **현 precompute 상태:** 4단계도 아직 precompute되지 않음. `scripts/build-gene-coords.py` 로 gene_models 좌표는 있으므로, 3단계 SV matrix가 생성되면 bedtools-like overlap으로 산출 가능. OG 경계는 "gene body 확장" vs "cluster span" vs "synteny block" 중 정책 선택이 필요하다. Promoter/upstream 판정 창(2 kb 등)은 벼 평균 intergenic 거리·gene density를 근거로 결정하고 문서에 명시해야 한다.

가장 중요한 단계입니다.

각 SV가 다음 중 어디에 걸리는지 확인합니다.

1. gene body와 overlap  
2. CDS/exon을 절단  
3. promoter/upstream region에 위치  
4. downstream region에 위치  
5. entire gene cluster를 포함  
6. copy number change를 유발  
7. inversion boundary가 gene 근처에 위치  
8. TE-rich region 또는 repeat region에 위치

실무적으로는 각 gene에 Orthogroup ID를 붙인 뒤, SV interval과 gene annotation을 겹치면 됩니다.

SV interval → affected gene → Orthogroup ID → function → phenotype group frequency

---

### 5단계. 후보 우선순위화

후보를 다음 기준으로 rank할 수 있습니다. 각 기준의 실행 준비 상태를 함께 표기한다.

| 우선순위 기준              | 강한 후보 조건                                          | 상태 / 현 데이터                                                                  |
| -------------------- | ------------------------------------------------- | -------------------------------------------------------------------------- |
| Group specificity    | 표현형 그룹에서 거의 고정, 반대 그룹에서 거의 부재                     | **ready** — OG copy matrix + Mann-Whitney U (구현됨, `diff.py`)                  |
| Functional relevance | 표현형과 관련된 domain/pathway                           | **ready** — Pfam / InterPro / GO 인덱싱 완료 (`functional-search-index`)          |
| Orthogroup pattern   | group-specific PAV 또는 copy number difference      | **ready** — OG copy matrix + PAV evidence classifier 구현됨                     |
| SV impact            | gene gain/loss, exon disruption, CNV, promoter SV | **pending** — 3·4단계 SV matrix + OG × SV intersect precompute 생성 후 가능     |
| Synteny support      | 같은 locus에서 구조적으로 설명 가능                            | **partial** — cluster-local halLiftover 있음. Genome-wide OG synteny block 비교는 미구현 |
| Expression support   | RNA-seq에서 발현 유무 또는 발현 차이                           | **feasible (bulk)** — bulk RNA-seq 기반 binary expressed / not-expressed 판정까지는 가능. 정량 DE는 replicate·design 따라 별도. |
| Known QTL overlap    | 기존 QTL/GWAS region과 겹침                            | **external-future** — 외부 DB 연동 필요 (현재 데이터 없음)                             |

가장 강한 후보는 보통 다음 형태입니다.

표현형 그룹 특이 SV  
+ SV 내부 또는 인접 orthogroup  
+ 표현형과 맞는 기능 annotation  
+ expression 차이  
+ 기존 QTL 또는 알려진 유전자와의 위치/기능 연관성

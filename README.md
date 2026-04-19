# Green Rice DB

> **이 리소스는 16개 한국 temperate japonica 품종에서 형질 그룹을 구분하는 후보 유전자 및 유전체 요소를 orthogroup, 변이, 그래프 기반 증거로 우선순위화해 제시하는 표현형 기반 후보 발견 데이터베이스이며, 후속 생물학적 검증의 출발점을 제공한다.**

## What this is

한국 벼 temperate japonica 16 품종을 대상으로, **표현형 그룹 간 차이를 만드는 후보 유전요소**를 찾기 위한 탐색 도구. 출발점은 표현형(형질 그룹), 도착점은 후속 실험으로 이어질 후보군.

## What it is not

- Marker/primer 설계 도구 아님 (KASP / CAPS / InDel)
- MAS / GS / GEBV 시스템 아님
- Validated PAV / pseudogene / 인과 변이 확정 catalog 아님
- 한국 벼 전체 대표 자원 아님 — 16 품종 panel 내부 비교

스코프 전체: [docs/product-specs/scope.md](docs/product-specs/scope.md)

## Primary user

Trait biologist · QTL 후속 연구자 · upstream (pre-MAS) breeder. 분자 육종 마커 개발자는 주 사용자 아님.

## User flow

```
Dashboard (표현형 분포 + 자동 그룹핑)
   ↓
Explore (trait 선택 → candidate OG 우선순위)
   ↓
OG Detail (증거 수렴)
  ├─ Gene Locations     — cultivar별 gene 좌표 + cluster
  ├─ Gene-region Variants — group별 AF + SV-like 배지
  └─ Pangenome Graph    — cluster-derived tube map + annotation overlay
   ↓
Download (후속 검증용 candidate 테이블)
```

자세한 정의: [docs/product-specs/idea.md](docs/product-specs/idea.md)

## Architecture

- **Frontend**: React 19 + TypeScript 5 (strict) + Vite + Tailwind v4 + shadcn/ui
- **Backend**: Firebase (Firestore + Storage + Cloud Functions Python)
- **Data pipelines**: OrthoFinder, Cactus pangenome (HAL/GBZ/VCF), GMM auto-grouping, LLM functional classification

자세한 아키텍처: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
파이프라인: [docs/references/data-pipelines.md](docs/references/data-pipelines.md)

## Development

```bash
npm install
npm run dev          # Vite dev server
npm run build        # tsc + vite build
npm run check:all    # lint + type-check + architecture check
```

Agent 협업 규칙: [CLAUDE.md](CLAUDE.md)

## Documentation

```
docs/
├── ARCHITECTURE.md              System overview
├── PLANS.md                     Roadmap
├── SECURITY.md                  Auth, rules, secrets
├── product-specs/
│   ├── scope.md                 ★ Identity lock (start here)
│   ├── idea.md                  Product vision
│   └── introduction.md          Manuscript intro draft
├── design-docs/                 Design decisions
├── exec-plans/                  Execution plans (active/completed)
├── references/                  Conventions + pipelines
└── generated/                   Auto-generated references
```

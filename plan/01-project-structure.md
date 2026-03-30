# 01. 프로젝트 구조

## 기술 스택 버전

| Tool | Version | Note |
|------|---------|------|
| Vite | latest (6.x) | `npm create vite@latest` |
| React | 19.x | TypeScript template |
| TypeScript | 5.x | strict mode |
| Tailwind CSS | v4 | shadcn/ui 최신과 호환 |
| shadcn/ui | latest | `npx shadcn@latest init` |
| Chart.js | 4.x | `react-chartjs-2` wrapper |
| Firebase | 12.x | modular SDK (tree-shakable) |
| React Router | 7.x | SPA routing |
| PapaParse | latest | CSV 파싱 |

## 폴더 구조

```
green-rice-web/
├── data/
│   └── phenotype_table.csv          # 원본 데이터
├── plan/                            # 설계 문서
├── public/
│   └── data/
│       └── phenotype_table.csv      # 런타임 접근용 복사본
├── src/
│   ├── components/
│   │   ├── ui/                      # shadcn/ui 컴포넌트
│   │   ├── layout/                  # Header, Sidebar, Layout
│   │   ├── charts/                  # Chart.js wrapper 컴포넌트
│   │   ├── dashboard/               # Dashboard 전용 위젯
│   │   ├── comparison/              # 비교 페이지 전용 컴포넌트
│   │   └── data-table/              # 테이블 관련 컴포넌트
│   ├── pages/
│   │   ├── DashboardPage.tsx
│   │   ├── ComparisonPage.tsx
│   │   ├── DataTablePage.tsx
│   │   └── LoginPage.tsx
│   ├── hooks/
│   │   ├── usePhenotypeData.ts      # 데이터 로딩 훅
│   │   └── useAuth.ts               # Firebase Auth 훅
│   ├── lib/
│   │   ├── firebase.ts              # Firebase 초기화
│   │   ├── data-service.ts          # 데이터 접근 추상화 레이어
│   │   └── utils.ts                 # 유틸리티
│   ├── types/
│   │   ├── phenotype.ts             # 표현형 타입
│   │   ├── genotype.ts              # 유전형 타입 (placeholder)
│   │   └── common.ts                # 공통 타입
│   ├── context/
│   │   └── AuthContext.tsx           # 인증 Context
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .env.example                     # 환경변수 예시
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
└── components.json                  # shadcn/ui 설정
```

## 핵심 설계 원칙

1. **데이터 소스 추상화**: `data-service.ts`가 CSV/Firestore 전환의 단일 접점
2. **타입 확장성**: genotype 타입을 placeholder로 미리 정의
3. **컴포넌트 분리**: 페이지별 컴포넌트 폴더로 관심사 분리
4. **Chart wrapper**: 재사용 가능한 차트 래퍼 컴포넌트 패턴

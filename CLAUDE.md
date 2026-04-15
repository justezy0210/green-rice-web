# CLAUDE.md — Green Rice Web

> 16개 한국 벼 품종의 표현형과 pangenome variation을 연결해 탐색하는 웹 데이터베이스

## Tech Stack

- React 19 + TypeScript 5 (strict) + Vite 8
- Tailwind CSS v4 + shadcn/ui
- Chart.js 4 via react-chartjs-2
- Firebase 12 (Auth, Firestore, Storage)
- React Router 7

## Dependency Direction (MUST follow)

```
Types → Lib → Hooks → Components → Pages
```

- `src/types/` — 순수 타입만. 다른 레이어 import 금지
- `src/lib/` — 서비스, 유틸리티. Types만 import 가능
- `src/hooks/` — React 훅. Types + Lib만 import 가능
- `src/context/` — 전역 상태. Types + Lib + Hooks 가능
- `src/components/` — UI. Pages를 import하면 안 됨
- `src/pages/` — 라우트 엔트리. 모든 하위 레이어 사용 가능

위반 시 `npm run check:arch` 에서 실패한다. 자세한 규칙: [docs/references/dependency-layers.md](docs/references/dependency-layers.md)

## File Conventions

- Components: `PascalCase.tsx`
- Hooks: `use*.ts`
- Services: `kebab-case.ts`
- Types: `kebab-case.ts`, PascalCase interfaces
- Max file size: 300 lines

## Path Aliases

`@/*` → `./src/*` (tsconfig paths)

## Key Commands

```bash
npm run dev          # Vite dev server
npm run build        # tsc + vite build
npm run lint         # ESLint
npm run check:arch   # 의존성 방향 검증 + 시크릿 스캔
npm run check:all    # lint + type-check + arch check
```

## Rules (MUST follow)

1. **시크릿 하드코딩 절대 금지** — API key, token, password, secret, credential 등 모든 민감 정보는 반드시 환경변수(`import.meta.env.VITE_*`)로 관리한다. 코드에 직접 문자열로 넣으면 ESLint(`no-restricted-syntax`)와 `check:arch` 스크립트가 이중으로 차단한다.
2. **환경변수는 `.env`에서 `VITE_FIREBASE_*` 접두사로 관리** — 새 변수 추가 시 반드시 `.env.example` 업데이트.
3. **`.env` 파일은 절대 커밋하지 않는다.**
4. **의존성 방향 엄수** — 위 다이어그램 참조. 위반 시 `check:arch` 실패.
5. **단일 진실 소스** — 타입은 `src/types/`, 환경변수는 `src/lib/firebase.ts`, 문서는 `docs/`.
6. **UI/로직 분리** — 데이터 페칭은 훅에서, 표시는 컴포넌트에서.
7. **차트는 Wrapper 패턴** — `components/charts/*Wrapper.tsx` 사용. Chart.js 직접 사용 금지.
8. **`@/` alias 사용** — `../../` 상대경로 import 금지.
9. **코드 내 모든 문자열은 영어** — UI 텍스트, 에러 메시지, 로그, 주석, 변수명 등 코드에 포함되는 모든 언어는 영어로 통일한다. 한국어는 문서(`docs/`, `CLAUDE.md`)에서만 사용.

## External Validation (Codex CLI) — MANDATORY

Claude가 리드, Codex가 외부 검증자. `verify` 스킬로 호출. 아래 시점에 자동 실행.

| 시점 | 모드 | 트리거 조건 |
|------|------|------------|
| `exec-plans/active/`에 계획 작성 후 | `plan-review` | 계획 파일 작성 완료 즉시 |
| 서비스/훅/Cloud Function 추가·변경 후 | `script-review` | 구현 태스크 완료 시 |
| 레이어/폴더 구조 변경 후 | `structure-review` | 디렉토리 재편, 규칙 변경 시 |
| 커밋 직전 또는 기타 종합 점검 | `general-review` | uncommitted 변경이 큰 경우 |

**검증 결과 처리 규칙:**
1. Codex 출력 요약 + 이슈별 수정안 제시 후 사용자 승인을 받고 수정
2. 임의로 코드 변경 금지 — 승인된 이슈만 반영
3. 계획 검증은 최대 2회, 나머지는 구현 시 해결

## Data Flow

```
Firestore → src/lib/*-service.ts → src/hooks/use*.ts → Components
```

- `data-service.ts` — 표현형 데이터 CRUD
- `cultivar-service.ts` — 품종 데이터 CRUD
- `genome-upload-service.ts` — 유전체 업로드 파이프라인

## Documentation (deeper context)

```
docs/
├── ARCHITECTURE.md                       # System overview, layers, data model
├── PLANS.md                              # Roadmap, phase tracking
├── SECURITY.md                           # Secrets, Firebase rules, auth
├── index.md                              # Documentation index
├── progress.md                           # Phase-by-phase progress
├── design-docs/                          # Architecture & design
│   ├── project-structure.md
│   ├── pages-and-routing.md
│   ├── type-definitions.md
│   ├── firebase-architecture.md
│   └── component-design.md
├── exec-plans/                           # Execution plans (agent workflow)
│   ├── active/                           # Plans in progress
│   ├── completed/                        # Finished plans with results
│   ├── tech-debt.md                      # Tech debt tracker
│   └── README.md                         # Plan template & rules
├── generated/                            # Auto-generated references
│   └── db-schema.md                      # Firestore schema
├── product-specs/                        # Product vision & requirements
│   └── idea.md
└── references/                           # Conventions & principles
    ├── golden-principles.md
    └── dependency-layers.md
```

## Plan Workflow

Non-trivial 작업 시작 전 반드시 `docs/exec-plans/active/`에 계획을 작성한다.
완료 후 `completed/`로 이동. 계획 템플릿: [exec-plans/README.md](docs/exec-plans/README.md)

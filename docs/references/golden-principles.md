# Golden Principles

이 프로젝트의 코드 품질과 일관성을 유지하기 위한 핵심 원칙.

## 1. 단일 진실 소스 (Single Source of Truth)

- 타입 정의는 `src/types/`에만 존재한다
- 환경변수는 `src/lib/firebase.ts`에서만 읽는다
- 문서는 `docs/`가 유일한 소스이다

## 2. 의존성 방향

- `Types → Lib → Hooks → Components → Pages` 방향으로만 import한다
- 상위 레이어가 하위 레이어를 import하면 안 된다
- 자세한 규칙: [dependency-layers.md](dependency-layers.md)

## 3. 네이밍 컨벤션

- **파일명**: PascalCase (컴포넌트), camelCase (훅, 서비스), kebab-case (설정)
- **컴포넌트**: PascalCase (`StatsCardGrid.tsx`)
- **훅**: `use` 접두사 + camelCase (`usePhenotypeData.ts`)
- **서비스**: kebab-case (`data-service.ts`)
- **타입**: PascalCase interface/type (`PhenotypeRecord`)

## 4. 파일 크기 제한

- 단일 파일은 **300줄**을 넘지 않는다
- 넘을 경우 관심사 분리를 통해 분할한다

## 5. 환경변수 & 시크릿

- API 키, 시크릿은 반드시 환경변수로 관리한다
- `.env` 파일은 절대 커밋하지 않는다
- 새 환경변수 추가 시 `.env.example`을 업데이트한다

## 6. 에러 핸들링

- Firebase 호출은 try-catch로 감싼다
- 사용자에게 보이는 에러는 한국어 메시지로 처리한다
- console.error로 디버그 정보를 남긴다

## 7. 컴포넌트 설계

- UI 컴포넌트(`components/ui/`)는 비즈니스 로직을 포함하지 않는다
- 데이터 페칭은 훅에서, 표시는 컴포넌트에서 분리한다
- Props는 명시적으로 타입을 정의한다

## 8. 차트 컴포넌트

- 모든 차트는 `components/charts/` 아래 Wrapper 패턴을 사용한다
- Chart.js 직접 사용 금지 — 반드시 react-chartjs-2 래퍼를 통한다
- 공통 옵션(반응형, 툴팁, 색상)은 래퍼에서 관리한다

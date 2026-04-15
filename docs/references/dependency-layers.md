# Dependency Layers

이 프로젝트의 의존성은 반드시 아래 방향으로만 흐른다.

```
Types → Lib → Hooks → Components → Pages
  ↑                       ↑
Config (env vars)     Context (providers)
```

## Layer 정의

| Layer | 경로 | 역할 | 허용되는 import |
|-------|------|------|----------------|
| **Types** | `src/types/` | 순수 타입 정의 | 없음 (최하위 레이어) |
| **Config** | `src/lib/firebase.ts` | 환경변수 기반 설정 | Types |
| **Lib** | `src/lib/` | 비즈니스 로직, 데이터 서비스 | Types, Config |
| **Hooks** | `src/hooks/` | React 훅 (상태 + 데이터 페칭) | Types, Lib |
| **Context** | `src/context/` | React Context (전역 상태) | Types, Lib, Hooks |
| **Components** | `src/components/` | UI 컴포넌트 | Types, Lib, Hooks, Context |
| **Pages** | `src/pages/` | 페이지 (라우트 엔트리) | 모든 하위 레이어 |

## 위반 예시

```typescript
// WRONG: Types가 Lib을 import
// src/types/cultivar.ts
import { db } from '@/lib/firebase';  // 위반!

// WRONG: Hooks가 Components를 import
// src/hooks/usePhenotypeData.ts
import { StatsCard } from '@/components/dashboard/StatsCardGrid';  // 위반!

// WRONG: Lib이 Hooks를 import
// src/lib/data-service.ts
import { useAuth } from '@/hooks/useAuth';  // 위반!
```

## 검증

`npm run check:arch` 로 의존성 방향 위반을 자동 검사한다.

# 04. Firebase 연동 구조

## 초기 MVP 전략

MVP에서는 **CSV 파일을 직접 로딩**하되, Firebase로의 전환이 쉬운 추상화 레이어를 구성합니다.

```
[CSV in public/] → [data-service.ts] → [React hooks] → [Components]
                         ↑
              향후 Firestore로 교체 가능
```

## Firebase 프로젝트 구조

### 환경변수 (`.env`)

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### Firebase 초기화 (`lib/firebase.ts`)

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

## 데이터 접근 추상화 (`lib/data-service.ts`)

```typescript
// 인터페이스로 정의 → CSV 구현 / Firestore 구현 교체 가능
interface DataService {
  getPhenotypeRecords(): Promise<PhenotypeRecord[]>;
  getPhenotypeFields(): PhenotypeField[];
  getDatasetSummary(): Promise<PhenotypeDatasetSummary>;
}

// MVP: CSV 기반 구현
class CsvDataService implements DataService { ... }

// 향후: Firestore 기반 구현
// class FirestoreDataService implements DataService { ... }

export const dataService: DataService = new CsvDataService();
```

## Auth 구조

### AuthContext

```typescript
// context/AuthContext.tsx
// - 현재 사용자 상태 관리
// - 로그인/로그아웃 함수
// - 로딩 상태
// - 향후 역할 기반 접근 제어 확장 가능
```

### 초기 MVP: 이메일/비밀번호 로그인
- `signInWithEmailAndPassword`
- `createUserWithEmailAndPassword`
- `signOut`

### 향후 Firestore 데이터 모델 (참고)

```
firestore/
├── cultivars/
│   └── {cultivarId}/
│       ├── phenotype: { ... }
│       └── genotype: { ... }    # 향후 추가
├── metadata/
│   └── dataset-info
└── users/
    └── {userId}/
        └── preferences: { ... }
```

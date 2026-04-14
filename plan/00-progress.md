# Green Rice Web — 진행 상황

## Phase 1: MVP 기본 구현
- [x] 프로젝트 구조 설계 (plan 01~05)
- [x] 타입 정의 (phenotype, genotype, common)
- [x] CSV 기반 데이터 서비스 구현
- [x] 페이지 구현 (Dashboard, DataTable, Comparison, Login)
- [x] 차트 컴포넌트 (Bar, Scatter, Distribution, Heatmap)
- [x] Auth 컨텍스트 및 훅

## Phase 2: Firebase 연결
- [x] Firebase 프로젝트 생성 (green-rice-db)
- [x] .env 설정 및 연결 확인
- [x] Firestore 데이터베이스 생성
- [x] Firestore 보안 규칙 설정 (읽기 공개, 쓰기 인증 필요)
- [x] CSV → Firestore 데이터 마이그레이션 (11개 품종)
- [x] data-service.ts를 Firestore 기반으로 전환
- [x] Auth 프로바이더 설정 및 테스트 (Email/Password, Google)

## Phase 3: UI 개편
- [ ] 홈페이지를 검색/탐색 허브로 재설계
- [ ] 품종 상세 페이지 추가 (/cultivar/:name)
- [ ] 페이지 역할 재구성 (Dashboard → 별도 메뉴)
- [ ] 시각적 차별화 (벼 테마, 컬러 팔레트)

## 미정 / 향후
- [ ] Genotype 데이터 연동
- [ ] Firebase Analytics (measurementId 추가)
- [ ] 배포 (Firebase Hosting)

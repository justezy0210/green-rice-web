# [PLAN] Harness Engineering Migration

## Goal
OpenAI harness engineering 구조를 프로젝트에 적용하여 에이전트가 안정적으로 작업할 수 있는 환경 구축

## Context
기존에 plan/ 디렉토리에 설계 문서가 산재, 아키텍처 제약 미검증, 에이전트용 컨텍스트 맵 부재

## Approach
1. docs/ 디렉토리 재구조화 (design-docs, product-specs, references, exec-plans)
2. CLAUDE.md 작성 (에이전트 컨텍스트 맵)
3. 아키텍처 제약 검증 스크립트 (check-architecture.ts)
4. ESLint 커스텀 규칙 강화
5. Codex CLI 외부 검증 시스템 (/verify 스킬)
6. Codex 검증으로 발견된 이슈 수정

## Files modified
- CLAUDE.md (신규)
- docs/** (전체 재구조화)
- scripts/check-architecture.ts (신규)
- scripts/codex-verify.sh (신규)
- .claude/skills/verify/SKILL.md (신규)
- eslint.config.js (규칙 강화)
- package.json (scripts 추가)
- src/types/cultivar.ts, genome.ts (런타임 함수 제거)
- src/lib/cultivar-helpers.ts, genome-helpers.ts (신규)
- src/components/cultivar/* (CultivarDetailPage 분할)
- src/lib/*-service.ts (에러 처리 추가)
- src/pages/* (영어 메시지 통일)
- src/pages/AdminPage.tsx (GenomeUploadPanel 연결)

## Verification
- [x] check:arch 통과
- [x] tsc --noEmit 통과
- [x] /verify arch — Codex 외부 검증 실행, 4개 이슈 발견 후 수정

## Result
- Status: DONE
- Notes: Codex gpt-5.4 외부 검증으로 types/ 런타임 로직, SRP 위반, 에러 처리, 상대 import 이슈 발견 및 수정 완료

# Execution Plans

에이전트가 비자명(non-trivial) 작업을 수행하기 전에 반드시 계획을 작성하는 디렉토리.

## 규칙

1. **작업 시작 전** `active/`에 계획 파일을 생성한다
2. **작업 완료 후** `completed/`로 이동하고 결과를 기록한다
3. 계획 없이 큰 변경을 시작하지 않는다

## 파일 형식

```markdown
# [PLAN] 제목

## Goal
무엇을 달성하려는가

## Context
왜 이 작업이 필요한가

## Approach
1. 단계별 접근 방식
2. ...

## Files to modify
- `src/...`
- `src/...`

## Risks / Open questions
- ...

## Verification
- [ ] check:arch 통과
- [ ] tsc --noEmit 통과
- [ ] /verify 외부 검증 통과 (해당 시)

## Result (completed 이동 시 작성)
- Status: DONE / PARTIAL / ABANDONED
- Notes: ...
```

## 디렉토리 구조

```
exec-plans/
├── active/          ← 현재 진행 중인 계획
├── completed/       ← 완료된 계획 (이력)
├── tech-debt.md     ← 기술 부채 추적
└── README.md        ← 이 파일
```

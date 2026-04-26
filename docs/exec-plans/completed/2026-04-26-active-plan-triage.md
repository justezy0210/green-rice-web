# [PLAN] Active plan triage

## Goal
Reduce `docs/exec-plans/active/` to plans that are genuinely active now.

## Context
Several active plans predate the entity-centered pivot, the v2 OG-region
release, the shadcn migration, and recent cleanup work. Keeping stale plans in
`active/` makes it hard for Codex or Claude to pick the real next task.

## Approach
1. Compare each active plan against current code and current product framing.
2. Move implemented or superseded plans to `completed/` with a short result
   note.
3. Keep only current, actionable plans in `active/`.
4. Run `git diff --check` because this is a docs/move cleanup.

## Files to modify
- `docs/exec-plans/active/*`
- `docs/exec-plans/completed/*`

## Verification
- [x] `git diff --check`

## Result
- Status: DONE
- Notes: Active plans were triaged against the current app. Implemented or
  superseded plans were moved to `completed/`; no current implementation plan
  remains active after this cleanup.

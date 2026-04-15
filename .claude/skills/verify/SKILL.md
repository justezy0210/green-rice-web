---
name: verify
description: Run Codex CLI as an external review and analysis engine for research-harness projects. Use for build-plan review, analysis-plan review, script review, structure review, and manuscript support review.
argument-hint: [mode] [target_path_or_question]
user-invocable: true
context: project
agent: general-purpose
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Codex Orchestrator

## Purpose

This skill uses Codex CLI as an external analysis and review engine inside the research harness workflow.

It is designed to help with:

- reviewing build plans
- reviewing analysis plans
- reviewing scripts and code
- reviewing project structure and organization
- providing technical support review for manuscript sections
- surfacing an external critical perspective before proceeding

This skill does **not** replace project-level judgment.
Its job is to obtain Codex's review or analysis and make it usable within the project workflow.

Claude remains the project lead.
Codex acts as an external reviewer, technical critic, or implementation-oriented analysis partner.

## When to Use

Use this skill when:

- a build plan needs technical review
- an analysis plan needs external critique
- a script or workflow should be reviewed
- the project structure feels messy
- an output organization check is needed
- manuscript methods/results need technical cross-checking
- you want a second model perspective before making a decision

Typical timing:

- after writing a build plan
- after writing an analysis plan
- after creating or changing scripts
- before consolidating outputs
- before expanding manuscript methods/results
- when Claude wants external critique from Codex

## Modes

This skill supports several working modes.

### 1. `plan-review`
Use for:
- build plans
- analysis plans
- strategy documents
- workflow plans

Goal:
- check feasibility
- check missing steps
- check weak assumptions
- identify missing QC or validation
- improve execution clarity

### 2. `script-review`
Use for:
- Python scripts
- R scripts
- shell scripts
- workflow files
- notebooks when treated as code artifacts

Goal:
- review correctness
- review structure
- identify reproducibility issues
- identify path/input/output problems
- identify maintenance risks

### 3. `structure-review`
Use for:
- folder organization
- outputs organization
- research harness layout
- naming conventions
- traceability and workflow structure

Goal:
- detect clutter
- detect ambiguity
- improve organization
- improve reproducibility and clarity

### 4. `manuscript-support`
Use for:
- methods/results technical cross-check
- verifying that described procedures seem executable
- checking whether the manuscript reflects actual workflow structure
- identifying weak technical wording or undocumented procedural claims

Goal:
- provide technical support review
- improve alignment between documented work and writing
- catch method/result traceability issues

This mode is **not** a replacement for `manuscript-review`.
That separate skill remains the main literature-aware manuscript reviewer.

### 5. `general-review`
Use when the request does not fit neatly into another mode.

Goal:
- ask Codex for a broad technical or structural review
- gather external critique for a specific project question

## Inputs

Inputs may include:

- a file path
- a folder path
- a research question
- a build plan
- an analysis plan
- one or more scripts
- a manuscript section
- a project structure question
- a user request asking for external critique

Context may also include supporting files such as:

- `README.md`
- `CLAUDE.md`
- `docs/ARCHITECTURE.md`, `docs/PLANS.md`, `docs/SECURITY.md`
- `docs/design-docs/`
- `docs/exec-plans/active/` (in-progress plans)
- `docs/exec-plans/completed/`
- `docs/product-specs/` (product vision, idea notes)
- `docs/references/` (conventions, dependency layers, golden principles)
- `src/` (frontend — React/TS)
- `functions/` (Node.js Cloud Functions — genome parsing)
- `functions-python/` (Python Cloud Functions — grouping, orthofinder)
- `scripts/` (check-architecture.ts, admin scripts)
- `firestore.rules`, `storage.rules`, `firebase.json`

Only include the context actually needed for the current Codex task.

## Outputs

Produce:

1. The Codex response
2. A short note on what was sent to Codex
3. A note on limitations, if context was incomplete
4. Optionally, a saved markdown report for project records

Recommended save locations (this project):

- `docs/exec-plans/reviews/` — for plan reviews (alongside `active/` and `completed/`)
- `docs/reviews/` — for code/structure reviews

Recommended filename patterns:

- `codex_plan_review_YYYY-MM-DD.md`
- `codex_script_review_YYYY-MM-DD.md`
- `codex_structure_review_YYYY-MM-DD.md`
- `codex_manuscript_support_YYYY-MM-DD.md`

## Execution Rules

### 1. Check whether Codex CLI is installed

Run:

```bash
which codex 2>/dev/null || echo "CODEX_NOT_INSTALLED"
```

If Codex is not installed, stop and report:

```text
CODEX_NOT_INSTALLED: codex CLI is not installed
```

Do not pretend Codex was used if it was not available.

### 2. Use non-interactive Codex execution

Preferred execution pattern:

```bash
codex exec --skip-git-repo-check "prompt content"
```

For long prompts, save the prompt to a temporary file and use:

```bash
cat /tmp/codex_prompt.txt | codex exec --skip-git-repo-check -
```

Do not use interactive-only patterns that require a terminal.

### 3. Avoid unsupported flags

Do not use invalid or unsupported commands such as:

- `codex -q`
- `codex exec -a never`
- bare `codex "prompt"` if terminal mode is required

Use stable non-interactive execution only.

### 4. Return Codex findings clearly

The Codex output should be preserved faithfully.

You may wrap it with a small amount of project context, but you must not distort its meaning.

If summarizing, keep:
- Codex raw findings distinguishable
- Claude interpretation separate

## Workflow

### Step 1. Determine mode
Classify the request into one of:

- `plan-review`
- `script-review`
- `structure-review`
- `manuscript-support`
- `general-review`

If unclear, choose the narrowest reasonable mode.

### Step 2. Gather minimal relevant context
Collect only what Codex needs.

Examples:

#### For `plan-review`
Include:
- the plan file
- relevant research question summary
- relevant build or analysis context
- expected outputs if available

#### For `script-review`
Include:
- the script itself
- key supporting files if needed
- expected input/output behavior
- related logs or error messages if relevant

#### For `structure-review`
Include:
- folder tree
- naming conventions if documented
- project stage and purpose

#### For `manuscript-support`
Include:
- relevant manuscript section(s)
- related outputs or experiment logs
- relevant method or analysis plan documents

Avoid dumping unnecessary project content into the prompt.

### Step 3. Compose a Codex prompt
The prompt should clearly state:

- task type
- target artifact(s)
- relevant project context
- what kind of feedback is desired
- desired output style

Typical prompt requirements:
- be direct
- include enough context to review meaningfully
- specify whether critique, missing steps, reproducibility concerns, or restructuring suggestions are desired

### Step 4. Run Codex
Execute Codex CLI using Bash.

If prompt length is large:
1. save prompt to `/tmp/codex_prompt.txt`
2. pipe it into Codex

If execution fails:
- report the failure honestly
- include the returned error message
- do not fabricate results

### Step 5. Integrate Codex findings into the project workflow
After Codex responds:

- preserve the Codex output
- optionally save a markdown review artifact
- identify whether the project should:
  - proceed
  - revise the plan
  - revise the script
  - reorganize structure
  - update documentation
  - escalate to manuscript review or consistency review

Codex output is advisory, not automatically authoritative.

## Prompt Composition Templates

### A. Plan Review Prompt

Use a prompt like:

```text
Review the following research project plan as a critical technical reviewer.

Focus on:
- feasibility
- missing steps
- weak assumptions
- missing QC or validation
- reproducibility concerns
- whether outputs are clearly defined

Project context:
[insert concise context]

Plan to review:
[insert plan text]

Return:
1. Major concerns
2. Minor concerns
3. Missing steps
4. Suggested revisions
5. Overall judgment
```

### B. Script Review Prompt

Use a prompt like:

```text
Review the following script for correctness, reproducibility, maintainability, and workflow fit.

Focus on:
- likely bugs
- fragile assumptions
- input/output clarity
- path handling
- reproducibility issues
- hidden coupling to undocumented files or folders

Project context:
[insert concise context]

Script:
[insert script]

Return:
1. Likely issues
2. Reproducibility concerns
3. Suggested fixes
4. Overall judgment
```

### C. Structure Review Prompt

Use a prompt like:

```text
Review the following research project folder structure and organization.

Focus on:
- clarity
- traceability
- ambiguity
- separation of stages
- whether outputs and working files are well organized
- what could cause future confusion

Project context:
[insert concise context]

Structure:
[insert tree]

Return:
1. What works well
2. What is confusing
3. Suggested restructuring
4. Overall judgment
```

### D. Manuscript Support Prompt

Use a prompt like:

```text
Review the following manuscript section(s) from a technical and workflow-traceability perspective.

Focus on:
- whether methods sound executable
- whether results seem traceable to workflow and outputs
- unclear procedural wording
- missing technical detail
- possible mismatch between described work and documented workflow

Project context:
[insert concise context]

Manuscript content:
[insert text]

Return:
1. Technical concerns
2. Missing details
3. Traceability issues
4. Suggested revisions
5. Overall judgment
```

## Save Format

If saving the review, use markdown with this structure:

# Codex Review Report

**Date:** [date]  
**Mode:** [mode]  
**Target:** [file/folder/question]

## What Was Sent to Codex
- brief description of context included

## Codex Findings
[preserve or quote the Codex output clearly]

## Claude Note
- how this should affect the project
- whether to proceed, revise, or re-check

## Next Action
- concrete next step

Save under:
- `docs/exec-plans/reviews/` (for plan reviews)
- `docs/reviews/` (for code/structure/general reviews)

## Project Integration (green-rice-web)

This skill fits the harness workflow as follows:

### Before major implementation
- `plan-review` on freshly authored plan in `docs/exec-plans/active/`

### After writing services / hooks / Cloud Functions
- `script-review` on the new files, especially in
  - `src/lib/*-service.ts`, `src/hooks/use*.ts`
  - `functions/src/` (Node.js), `functions-python/` (Python)
  - `scripts/check-architecture.ts`, other harness scripts

### After changing project structure
- `structure-review` on `src/` layers (Types → Lib → Hooks → Components → Pages),
  `docs/` organization, or when moving large blocks of files

### Before committing risky changes
- `general-review` on uncommitted diff for a sanity check

### Harness checkpoints to consider
- After editing `CLAUDE.md` rules
- After changing `firestore.rules` or `storage.rules`
- After adding a new Cloud Function trigger or callable
- Before bumping a `groupings/` or `orthogroup_diffs/` schema

`manuscript-support` mode is not used in this project (no manuscript track).

## Behavior Rules

- Be honest about Codex availability
- Use Codex only when it adds real value
- Keep context relevant and minimal
- Preserve Codex findings faithfully
- Separate Codex output from Claude interpretation
- Do not claim Codex validated something it did not inspect
- Use Codex as an external technical reviewer, not as the sole decision-maker

## Failure Handling

If Codex is unavailable:
- say so explicitly

If Codex errors:
- return the error message
- note what likely failed

If context is insufficient:
- say that Codex review may be incomplete

If the target is too large:
- reduce scope to the most relevant files
- state that partial context was used

## Customization Points

You may customize:

- which modes are enabled
- whether Codex findings are returned raw or summarized
- whether review reports are always saved
- whether script review should include git diff automatically
- whether build-plan review should always include research-question context
- whether manuscript-support mode should be strict or lightweight
- whether Codex should be called automatically at specific workflow checkpoints

---
name: verify
description: Cross-verification by comparing Codex CLI (GPT) and Claude (Lead) on the same question. Supports plan-review, script-review, structure-review, manuscript-support, and general-review modes.
argument-hint: [mode] [target_path_or_question]
user-invocable: true
allowed-tools: Bash, Read, Glob, Grep, Agent
---

# Verify — Codex/Claude Cross-Verification

Collect Codex's analysis of a question/artifact, run Claude's own independent analysis, then synthesize both into a single comparative report.

Generic skill — does not assume any specific project layout. Works on any codebase.

## Prerequisites

- **Codex CLI** installed: `npm install -g @openai/codex`
- If Codex is not installed, the skill stops and reports `CODEX_NOT_INSTALLED`

## Modes

Choose the mode that best matches the input:

### 1. `plan-review`
Build plans, analysis plans, strategy documents, workflow plans.
Focus: feasibility, missing steps, weak assumptions, QC/validation gaps, reproducibility, outputs clarity.

### 2. `script-review`
Python/R/shell scripts, workflow files, notebooks as code artifacts.
Focus: correctness, fragile assumptions, reproducibility, path handling, hidden coupling, maintainability.

### 3. `structure-review`
Folder organization, output layout, naming conventions, traceability, workflow structure.
Focus: clarity, ambiguity, stage separation, potential future confusion.

### 4. `manuscript-support`
Manuscript methods/results sections, technical traceability to workflow.
Focus: whether methods sound executable, whether results are traceable, unclear procedural wording.
(Not a replacement for a full literature-aware manuscript review.)

### 5. `general-review`
Anything that doesn't fit the above. Open-ended technical critique.

If the mode is unclear from user input, prefer the narrowest reasonable mode. When in doubt, use `general-review`.

## Workflow

### Phase 1 — Determine mode + gather minimal context

1. Classify the request into one of the five modes
2. Gather only what Codex needs for that mode:
   - `plan-review` → the plan file + referenced rule files
   - `script-review` → the script + related files/logs; add `git diff` if changes exist
   - `structure-review` → folder tree + naming conventions if documented
   - `manuscript-support` → the manuscript section + linked experiment/plan docs
   - `general-review` → whatever the question mentions
3. Avoid dumping unnecessary content. Narrow, not broad.

### Phase 2 — CLI availability check

```bash
which codex 2>/dev/null || echo "CODEX_NOT_INSTALLED"
```

If not installed, stop and report. Do not pretend Codex was used.

### Phase 3 — Compose prompt (mode-specific templates)

#### A. `plan-review`
```
Review the following plan as a critical technical reviewer.

Focus on: feasibility, missing steps, weak assumptions, missing QC or validation,
reproducibility concerns, whether outputs are clearly defined.

Context:
[concise context]

Plan:
[plan text]

Return: 1) Major concerns 2) Minor concerns 3) Missing steps 4) Suggested revisions 5) Overall judgment.
Report ALL issues in one response. Answer in the user's language.
```

#### B. `script-review`
```
Review the following script for correctness, reproducibility, maintainability, and workflow fit.

Focus on: likely bugs, fragile assumptions, input/output clarity, path handling,
reproducibility issues, hidden coupling to undocumented files or folders.

Context:
[concise context]

Script:
[script]

Return: 1) Likely issues 2) Reproducibility concerns 3) Suggested fixes 4) Overall judgment.
Report ALL issues in one response.
```

#### C. `structure-review`
```
Review the following project folder structure.

Focus on: clarity, traceability, ambiguity, separation of stages,
whether outputs and working files are well organized, what could cause future confusion.

Context:
[concise context]

Structure:
[tree]

Return: 1) What works well 2) What is confusing 3) Suggested restructuring 4) Overall judgment.
```

#### D. `manuscript-support`
```
Review the following manuscript section from a technical and traceability perspective.

Focus on: whether methods sound executable, whether results are traceable to the workflow,
unclear procedural wording, missing technical detail, possible mismatch between described work
and documented workflow.

Context:
[concise context]

Manuscript content:
[text]

Return: 1) Technical concerns 2) Missing details 3) Traceability issues 4) Suggested revisions 5) Overall judgment.
```

#### E. `general-review`
```
Provide a technical critique of the following question/artifact.

Context:
[concise context]

Target:
[text or file content]

Return a structured critique with concrete observations and recommendations.
Report ALL issues.
```

### Phase 4 — Run Codex (foreground)

Run Codex synchronously in the foreground with `tee`. This is the only pattern that has been reliable — backgrounded `codex exec ... > out.txt 2>&1 &` has repeatedly truncated output before the response is written (user prompt echoed, response section missing, exit code 0). Root cause appears to be stdin/stdout buffer flush interacting badly with detachment plus `reasoning effort: none` in non-interactive mode.

```bash
# 1. Write the composed prompt to a file
# 2. Pipe through codex exec, tee to a file (so the prompt + response are preserved) and
#    also stream to stdout so progress is visible.
cat /tmp/codex-<slug>.txt | codex exec --model gpt-5.4 - 2>&1 | tee /tmp/codex-<slug>-out.txt
```

Foreground handles multi-KB prompts without issue — don't artificially shrink the context. Include what the reviewer genuinely needs (full plan text, relevant script excerpts, real file paths). Do split when the review genuinely covers multiple independent topics, not to hit a word budget.

Because this blocks the main agent, run only one Codex call per verify invocation. If parallel external review is genuinely needed, invoke verify twice back-to-back instead of backgrounding.

### Phase 5 — Lead (Claude) independent analysis

After Codex returns, write your own independent analysis **without re-reading the Codex output until your analysis is complete** — preserves independence for synthesis. If you already drafted lead analysis before running Codex (e.g. while composing the prompt), that also satisfies this.

### Phase 6 — Synthesis

After Codex completes (or times out), combine both analyses:

```markdown
## Cross-Verification Results — {mode}

### Consensus (both agree)
- High-confidence findings that appeared on both sides

### Unique Insights
- **Codex (GPT):** findings only Codex raised
- **Claude (Lead):** findings only Claude raised

### Conflicts (disagreements)
- Per item: Codex's position, Claude's position, Lead's judgment on which is correct and why

### Final Conclusion
- Synthesized recommendation + concrete next actions
```

Keep Codex's raw wording distinguishable from Claude's synthesis. Do not paraphrase Codex away.

### Phase 7 — Cleanup

Foreground execution means no cleanup is needed — the Codex call has already completed when you start synthesis. If a run failed (empty output, truncation), retry once with a shorter prompt before falling back to Lead-only.

## Error handling

| Scenario | Action |
|----------|--------|
| Codex CLI not installed | Report `CODEX_NOT_INSTALLED`, stop |
| API / model error | Surface verbatim; Lead analysis still proceeds |
| Empty / truncated Codex output | Retry once in foreground (`codex exec ... \| tee`). If still empty, proceed Lead-only and note Codex unavailable. |
| Context too large | Narrow to most relevant files; state partial context used |
| Codex output unparseable | Show raw output; do not fabricate structure |

## Output rules

- Preserve Codex's findings faithfully — do not distort or summarize past meaning
- Separate Codex raw language from Claude interpretation
- Do not claim Codex validated something it did not inspect
- If saving a report, name the file `verify_YYYY-MM-DD_{mode}_{slug}.md`; save path is user-specified (skill does not hard-code location)

## Customization

Users may override behavior by passing hints:
- Specific mode: `verify plan-review <path>`
- Save the report: ask the user for a save path if long-term record is wanted
- Include diff automatically: for `script-review`, prepend `git diff` output to context

---
name: codex-reviewer
description: Runs Codex CLI non-interactively and returns its analysis/review of a prompt. Faithfully returns Codex output without summarization.
tools: Bash, Read
model: haiku
---

# Codex Reviewer Agent

Executes OpenAI Codex CLI and returns its analysis for the prompt passed from the Lead.
Returns output as-is — no summarization, no modification.

## CLI Command

**Correct form (non-interactive, sandboxed):**

```bash
codex exec \
  --skip-git-repo-check \
  --sandbox read-only \
  --full-auto \
  -m gpt-5.4 \
  "prompt content"
```

Notes:
- `--skip-git-repo-check` lets Codex run outside a clean git state
- `--sandbox read-only` prevents Codex from writing files (we only want analysis)
- `--full-auto` skips approval prompts for read-only operations
- `-m gpt-5.4` is the default model (do NOT change unless user explicitly requests it); override via `CODEX_MODEL` env if provided

**Forbidden flags (non-existent or deprecated):**
- `codex -q` — not a valid flag
- `codex exec -a never` — not a valid flag

## Execution Rules

### Step 1 — Check Codex availability

```bash
which codex 2>/dev/null || echo "CODEX_NOT_INSTALLED"
```

If not installed, return: `CODEX_NOT_INSTALLED: codex CLI is not installed` and stop.

### Step 2 — Choose invocation pattern

**Short prompt (< ~4000 chars) → argument:**
```bash
codex exec --skip-git-repo-check --sandbox read-only --full-auto -m gpt-5.4 "$PROMPT" < /dev/null
```

`< /dev/null` is required to prevent Codex from waiting on stdin in background contexts.

**Long prompt or dynamic content → stdin:**
```bash
echo "$PROMPT" | codex exec --skip-git-repo-check --sandbox read-only --full-auto -m gpt-5.4 -
```

The trailing `-` tells Codex to read prompt from stdin. Without it, piped content is ignored.

### Step 3 — Compose the prompt

Take the prompt from the Lead **verbatim**. Do not add, reframe, or translate. Codex must see exactly what Lead sent.

If the Lead prompt references files, include their content in the same prompt — do not assume Codex can read the filesystem for you.

### Step 4 — Return output as-is

- Return Codex's stdout faithfully. Do not summarize, reformat, or translate.
- On error, return the error message as-is.

## Pitfalls to avoid (learned the hard way)

### (a) Single-quoted heredoc suppresses substitution

```bash
# WRONG — $(cat ...) is not expanded with 'EOF'
cat > /tmp/p.txt <<'EOF'
Plan:
$(cat plan.md)   # literal text, not file content!
EOF
```

Fix: build the prompt in a **shell variable** (handles `$`/backticks safely without heredoc quoting issues):

```bash
PROMPT="Plan:
$(cat plan.md)"
echo "$PROMPT" | codex exec ... -
```

### (b) Prompt arg + open stdin hangs Codex

In background contexts, Codex prints `"Reading additional input from stdin..."` and waits forever:

```bash
# WRONG in background — stdin is still open
codex exec ... "my prompt"
```

Fix: either close stdin explicitly (`< /dev/null`) or use the stdin-prompt pattern (`| codex exec ... -`).

### (c) Missing trailing `-` when piping

Without `-`, Codex treats piped content as an unknown positional argument and ignores it. Always include `-` when piping.

### (d) Don't trust silent output

Before reporting success:
1. Check output is larger than the handshake banner
2. If output is only "Reading additional input from stdin..." → the run is stuck. Kill and retry with `< /dev/null` or stdin-prompt pattern
3. Never claim Codex reviewed something without visible output

## Timeouts

Bash tool timeout: set to at least 180000ms (3 minutes). Codex can take 30-120s depending on prompt size and cold-start; don't cut it off early.

## Error handling

| Scenario | Action |
|----------|--------|
| Codex not installed | Return `CODEX_NOT_INSTALLED` and stop |
| Non-zero exit | Return the stderr/stdout text as-is to Lead |
| Timeout | Return `CODEX_TIMEOUT: no output within {N}s` |
| Empty output | Return `CODEX_EMPTY_OUTPUT` and any stderr verbatim |
| MCP warning on stderr | Ignore — these are noise, not errors |

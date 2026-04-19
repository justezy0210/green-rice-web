# SSOT Tier 3 — Cross-Language Manifest + Cloud Functions SSOT

Status: active — 2026-04-19 (rev2 after second Codex plan-review)
Source: Codex `general-review` on Patch A + B (commit bd17586), then
Tier 1 (b52f0f3) and Tier 2 (a71fb6e). Two `plan-review` rounds on
this document: rev1 fixed under-specified packaging / TraitId validation
/ reference MVP / quality_check boundary / test wiring / parity surface;
rev2 fixes the remaining semantic-contract issue and Python execution
reproducibility. Codex verification budget for this plan is now spent
(2/2) — further changes are at lead's judgement.

## Decision

Canonical source of truth is `data/*.json` at the repo root. The
`functions-python/` bundle reads **generated copies** shipped as build
artifacts, not the root JSON directly, because Firebase Functions packages
only what sits under `functions-python/`. A single sync script **copies
bytes verbatim** (no parse / re-serialise) from root to generated-copy.
Schema validation is a separate step. A parity test validates that both
language runtimes decode the manifest into equivalent semantic shapes,
including direction / labels (because these drive group-label output).

## Why this, not the current mirror

Tier 2 landed three Python helpers (`_reference.py`, `_cultivars.py`,
`_storage_paths.py`) under `scripts/`. Drift is still possible in two
places:

1. Trait registry — TS `src/config/traits.ts` and Python
   `functions-python/grouping/trait_metadata.py` + `quality_check.py`
   independently list the 9 traits. Nothing checks equality.
2. IRGSP / storage-paths mirrors — helpers exist on both sides, but
   editing one without the other produces no compile error.

## Problem

- `functions-python/grouping/trait_metadata.py:5-78` hardcodes trait
  definitions (traitId, type, keys, direction, labels, unit).
- `functions-python/grouping/quality_check.py:21-38` branches on trait
  id literals to pick a Firestore extraction path per trait.
- `functions-python/orthofinder/parser.py:8-10` hardcodes `"IRGSP-1.0"`.
  This is a Cloud Function — it cannot `import` from
  `scripts/_reference.py`.
- No automated check that TS trait ids == Python trait ids.
- No automated check that TS storage path shapes == Python storage
  path shapes.

## Goal

- Single canonical source (`data/traits.json`, `data/cultivars.json`,
  `data/reference.json`) for trait registry, panel cultivar list, and
  IRGSP reference identifiers.
- The `functions-python/` deploy bundle carries a generated copy of the
  manifests it needs, produced by a raw-byte copy.
- A parity test fails the build when TS and Python loaders decode the
  same manifest into different semantic shapes (id, type, keys,
  direction, labels, unit).
- A freshness test fails the build when the generated copies under
  `functions-python/` are out of date relative to `data/`.
- A migration-safety test fails the build when the manifest-driven
  runtime `TraitMetadata` differs from the current hardcoded snapshot.

## Scope — In

### Manifest files (all at repo root)

- `data/traits.json` — MUST match the current runtime verbatim.
  `direction` values: `higher-is-more | higher-is-less | not-applicable`.
  `type` values: `multi-env | single-continuous | binary`.
  Fully-specified initial contents (mirrors
  `functions-python/grouping/trait_metadata.py:5-78` as of this commit):
  ```jsonc
  {
    "traits": [
      {
        "id": "heading_date",
        "label": "Days to Heading",
        "type": "multi-env",
        "keys": ["early", "normal", "late"],
        "direction": "higher-is-more",
        "labels": { "low": "early", "high": "late" },
        "unit": "days"
      },
      {
        "id": "culm_length",
        "label": "Culm Length",
        "type": "single-continuous",
        "keys": ["culmLength"],
        "direction": "higher-is-more",
        "labels": { "low": "short", "high": "tall" },
        "unit": "cm"
      },
      {
        "id": "panicle_length",
        "label": "Panicle Length",
        "type": "single-continuous",
        "keys": ["panicleLength"],
        "direction": "higher-is-more",
        "labels": { "low": "short", "high": "long" },
        "unit": "cm"
      },
      {
        "id": "panicle_number",
        "label": "Panicle Number",
        "type": "single-continuous",
        "keys": ["panicleNumber"],
        "direction": "higher-is-more",
        "labels": { "low": "low", "high": "high" },
        "unit": ""
      },
      {
        "id": "spikelets_per_panicle",
        "label": "Spikelets / Panicle",
        "type": "single-continuous",
        "keys": ["spikeletsPerPanicle"],
        "direction": "higher-is-more",
        "labels": { "low": "low", "high": "high" },
        "unit": ""
      },
      {
        "id": "ripening_rate",
        "label": "Ripening Rate",
        "type": "single-continuous",
        "keys": ["ripeningRate"],
        "direction": "higher-is-more",
        "labels": { "low": "low", "high": "high" },
        "unit": "%"
      },
      {
        "id": "grain_weight",
        "label": "1000-Grain Weight",
        "type": "single-continuous",
        "keys": ["grainWeight1000"],
        "direction": "higher-is-more",
        "labels": { "low": "light", "high": "heavy" },
        "unit": "g"
      },
      {
        "id": "pre_harvest_sprouting",
        "label": "Pre-harvest Sprouting",
        "type": "single-continuous",
        "keys": ["preHarvestSprouting"],
        "direction": "higher-is-more",
        "labels": { "low": "low", "high": "high" },
        "unit": "%"
      },
      {
        "id": "bacterial_leaf_blight",
        "label": "Bacterial Leaf Blight",
        "type": "binary",
        "keys": ["k1", "k2", "k3", "k3a"],
        "direction": "not-applicable",
        "labels": { "low": "susceptible", "high": "resistant" },
        "unit": ""
      }
    ]
  }
  ```
  `labels` is part of the semantic surface — `post_process.py:55` uses
  it to decide output group names, so parity must compare it.
- `data/cultivars.json` — unchanged. Already cross-language.
- `data/reference.json`:
  ```json
  {
    "sampleId": "IRGSP-1",
    "displayName": "IRGSP-1.0",
    "longName": "IRGSP-1.0 (Nipponbare)"
  }
  ```
  All three fields required — `longName` is consumed by
  `scripts/generate-metadata.py:22`, so it is not "TS-optional".

### Packaging (root → generated copies)

- New `scripts/sync-functions-manifests.ts`:
  performs **`fs.copyFileSync` byte-for-byte** from `data/*.json` to
  `functions-python/generated_manifests/*.json`. No JSON parse, no
  re-serialise. Schema check lives in `check:traits-schema` and the
  Python loader tests — not here.
- `functions-python/generated_manifests/README.md`: "Generated. Do not
  edit. Run `npm run sync:manifests` after editing `data/*.json`."
- New `scripts/check-manifest-freshness.ts`: copies sources to a tempdir
  and compares to the committed `generated_manifests/`. Non-zero exit
  on any byte difference.

### TS side

- `src/config/traits.ts`: thin loader over `data/traits.json`, mirrors
  `src/config/panel.ts`'s use of `data/cultivars.json`.
- `src/lib/irgsp-constants.ts`: thin loader over `data/reference.json`,
  same three exports (`IRGSP_SAMPLE_ID`, `IRGSP_DISPLAY_NAME`,
  `isReferencePathCultivar`). Internal loader asserts all three fields
  present at load time; a missing field throws on module init so test
  runs fail fast.
- **TraitId validation approach — chosen:** manual union in
  `src/types/traits.ts` stays authoritative; a new
  `scripts/check-traits-schema.ts` runs inside `check:all` and asserts:
  - Every id in `data/traits.json` is a member of `TraitId`
  - Every member of `TraitId` appears in `data/traits.json`
  - Every required field (`type`, `keys`, `direction`, `labels.low`,
    `labels.high`, `unit`) is present on every entry
  - `direction` ∈ `{higher-is-more, higher-is-less, not-applicable}`
  - `type` ∈ `{multi-env, single-continuous, binary}`
  Rejected alternative: JSON-derived generated TS module. Reason: adds
  a build step to the source tree; the manual union gives better
  IDE-hover docs for ~9 entries.
- `tsconfig.app.json` `include`: add `data/traits.json` and
  `data/reference.json` (required once imported — not "if needed").

### Python side

- `functions-python/shared/` (new package, `__init__.py` empty):
  - `manifests.py` — loads `generated_manifests/*.json`. Stdlib only
    (`json`, `pathlib`). Raises on missing required fields. No new
    dependency in `requirements.txt`.
  - `traits.py` — exposes `TRAITS: list[TraitMeta]`, `TRAIT_IDS: set[str]`,
    `is_trait_id(v: str) -> bool`, and a per-id lookup.
  - `reference.py` — exposes `IRGSP_SAMPLE_ID`, `IRGSP_DISPLAY_NAME`,
    `IRGSP_LONG_NAME`.
  - `storage_paths.py` — moved from `scripts/_storage_paths.py`.
- `scripts/_reference.py` and `scripts/_storage_paths.py` become **re-export
  shims**. Concrete implementation contract:
  ```python
  # scripts/_reference.py
  import sys
  from pathlib import Path
  sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "functions-python"))
  from shared.reference import *  # noqa: F401,F403
  ```
  Same shape for `scripts/_storage_paths.py`. `scripts/_cultivars.py`
  already reads `data/cultivars.json` directly and does not need a shim.
- `functions-python/grouping/trait_metadata.py`: reads from
  `shared.traits`. The hardcoded list is removed. `TraitMetadata`
  dataclass in `models.py` stays — only the population path changes.
- `functions-python/grouping/quality_check.py`:
  - Keeps the Python-level extractor map:
    ```python
    EXTRACTORS: dict[str, Callable[[dict], TraitObservation]] = {
        "heading_date": _extract_heading_date,
        ...
    }
    ```
  - Dispatch by id only. Firestore path literals stay in Python code.
  - Parity test asserts `EXTRACTORS.keys() == {t.id for t in TRAITS}`.
- `functions-python/orthofinder/parser.py`: reads
  `IRGSP_DISPLAY_NAME` from `shared.reference`.

### Parity test (`scripts/check-cross-language-parity.ts`)

Python side is invoked via the project Python:
`functions-python/venv/bin/python3 -c <snippet>`. CWD is repo root.
The snippet does `sys.path.insert(0, "functions-python")` then imports
from `shared.*` and prints its view as JSON to stdout. TS side loads
the manifests directly.

Comparison surface (explicit, no "small set"):

- **traits** — ordered list of tuples
  `(id, type, keys, direction, labels.low, labels.high, unit)` must be
  identical. `label` (display label) is NOT compared — that is UI-only.
- **cultivars** — ordered `id` list and `pangenome` boolean per entry.
- **reference** — `sampleId`, `displayName`, `longName` all must match.
- **storage paths** — every builder present on both sides must produce
  identical output on these canonical inputs:
  ```
  ogGeneCoordsPath("007")
  ogTubeMapPath("OG0000987")
  ogRegionPath("OG0000987", "baegilmi_chr02_10083653")
  ogRegionManifestPath()
  ogAlleleFreqPath(1, 2, "heading_date")
  ogAlleleFreqLegacyPath("heading_date")
  orthofinderOgMembersPath(1, "000")
  orthofinderBaegilmiAnnotationPath(1)
  orthofinderOgCategoriesPath(1)
  ```
  TS-only builders (`ogAlleleFreqLegacyPath` on one side only? — confirm
  at impl time) and Python-only builders (`orthofinder_matrix_path`,
  `orthofinder_og_descriptions_path`) are listed in a skipped section
  of the test so the surface mismatch is explicit, not hidden.

### Python execution reproducibility

- Local + CI use the same entrypoint:
  `functions-python/venv/bin/python3 -m pytest -q`.
- New `functions-python/requirements-dev.txt` pins `pytest` and any
  other dev-only deps. A one-line bootstrap in the repo README:
  ```bash
  python3 -m venv functions-python/venv && \
    functions-python/venv/bin/pip install -r functions-python/requirements.txt \
      -r functions-python/requirements-dev.txt
  ```
- `check:py` and `check:cross-language` both use
  `functions-python/venv/bin/python3` explicitly. If the venv is
  missing the scripts fail fast with an actionable message, not a
  silent fallback to system python.
- `functions-python/tests/conftest.py` already puts `functions-python`
  on `sys.path`. New `shared/` package is reachable from tests without
  further bootstrap.

### Wiring into `check:all`

Add to `package.json`:
```json
"sync:manifests": "tsx scripts/sync-functions-manifests.ts",
"check:manifest-freshness": "tsx scripts/check-manifest-freshness.ts",
"check:traits-schema": "tsx scripts/check-traits-schema.ts",
"check:cross-language": "tsx scripts/check-cross-language-parity.ts",
"check:py": "functions-python/venv/bin/python3 -m pytest -q functions-python/tests",
"check:all": "npm run lint && tsc --noEmit && npm run check:arch && npm run check:traits-schema && npm run check:manifest-freshness && npm run check:cross-language && npm run check:py"
```

### New Python tests (`functions-python/tests/`)

- `test_shared_manifests.py` — loader returns expected shapes; rejects
  malformed JSON, duplicate trait id, unknown `direction` or `type`,
  missing required field on any manifest.
- `test_quality_check_registry.py` — asserts
  `EXTRACTORS.keys() == {t.id for t in TRAITS}`. Also verifies that
  dispatch calls the right extractor for each id.
- `test_trait_metadata_migration_safety.py` — asserts that
  `TRAIT_METADATA` populated from `shared.traits` is **equal** to a
  snapshot constant of the pre-migration hardcoded list (pasted once
  into the test file). This is not a parity test across languages;
  it guards against the manifest silently changing runtime semantics.
- `test_reference_loader.py` and `test_cultivars_loader.py` — minimal
  required-field presence + value-set sanity on reference and cultivars
  manifests. Closes the "both sides read the same JSON wrong → parity
  passes" hole Codex flagged.

### FIELD_TO_TRAIT_ID

Decision: stays in `src/types/grouping.ts`, TS-only. Python has no
equivalent field naming. Documented in the file's docstring.

### IRGSP literal acceptance — clarified

- `git grep -n 'IRGSP-1\.0' functions-python/` returns **only** test
  fixtures and docstrings. Zero runtime constant references.
- `git grep -n 'IRGSP-1\.0' scripts/` returns only CLI usage/help text
  and `_reference.py` itself.
- Test fixtures are explicitly out of scope.

## Scope — Out

- No schema migration of Firestore `groupings/` docs or Storage
  artifacts.
- No change to grouping semantics (GMM / fixed-class). `quality_check.py`
  keeps thresholds and Firestore paths; only the trait-id dispatch
  becomes registry-driven.
- No runtime import of Python from TS or vice versa. Shared data
  crosses the boundary as JSON only.
- No touching of `functions-python/orthofinder/callable.py` or Cloud-
  Function entry points beyond `shared.reference` consumption.
- No generalization of the cross-language pattern to variant
  annotation or grouping thresholds — revisit once traits / cultivars
  / reference land.

## Non-goals

- Replacing docstring / help-text references to `IRGSP-1.0` in CLI
  usage strings.
- Rewriting `scripts/check-architecture.ts` beyond Tier 2.
- `.gitattributes linguist-generated=true` on the generated directory.
  Nice-to-have for GitHub code stats; unrelated to correctness or
  deploy.
- A CLI preview of `firebase deploy --only functions` output. The
  generated-copy presence in the bundle is established by file
  existence under `functions-python/generated_manifests/` and the
  freshness check — no deploy dry-run is required for acceptance.

## Risks

- **Stale generated copies.** `check:manifest-freshness` catches this
  locally and in CI.
- **Python schema drift from TS loader expectations.** Covered by
  `check:cross-language` comparing decoded shape equality, plus the
  standalone reference / cultivars loader tests.
- **`functions-python/venv` missing on a fresh clone.** `check:py` and
  `check:cross-language` fail loudly with a pointer to the bootstrap
  command. Not a silent skip.
- **`shared/` import from `scripts/`.** Covered by the explicit
  `sys.path.insert` shim contract above.

## Acceptance

1. `data/traits.json`, `data/cultivars.json`, `data/reference.json`
   all exist at repo root and match the fully-specified contents above.
2. `functions-python/generated_manifests/` contains byte-for-byte
   copies of the three JSON files, produced by
   `npm run sync:manifests`.
3. `npm run check:all` runs all seven steps and passes on a clean
   working tree.
4. Deliberate test — add a 10th trait to `data/traits.json` without
   touching `src/types/traits.ts`: `check:traits-schema` fails with
   a pointer to the missing union member.
5. Deliberate test — edit `data/traits.json` without
   `npm run sync:manifests`: `check:manifest-freshness` fails with
   a diff of the stale file.
6. Deliberate test — add a 10th trait, regenerate, but do not update
   `quality_check.EXTRACTORS`: `check:py` fails on
   `test_quality_check_registry.py`.
7. Deliberate test — flip `heading_date.direction` to `higher-is-less`
   in `data/traits.json`: `test_trait_metadata_migration_safety.py`
   fails before any runtime is affected.
8. `git grep -n 'IRGSP-1\.0' functions-python/` returns zero runtime
   references (test fixtures and docstrings allowed).
9. `ls functions-python/generated_manifests/` shows
   `traits.json cultivars.json reference.json` (and no other files).

## Open questions (resolve during implementation)

1. Should `scripts/check-manifest-freshness.ts` print the diff to
   stderr, a tmpfile, or both? Default: stderr.
2. Does `data/traits.json` get a top-level `schemaVersion` field for
   future migrations? Default: no — add when the first breaking change
   appears.
3. Does `shared/__init__.py` re-export from `traits`, `reference`,
   `storage_paths`? Default: no — force explicit submodule imports to
   keep the dependency graph legible.

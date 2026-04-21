# OG region release — v6_g4

Generated: 2026-04-21T04:50:07Z (UTC)
Operator: @justezy0210
Extractor git sha: unknown (not captured; 4067-OG batch on server)
Promote git sha: ace7fb0
Run ID (server staging): v6_g4_20260420T000602Z

## Input fingerprints

| Input | sha256 / contentHash | Size |
|---|---|---|
| `cleaned_cactus/gr-pg/green-rice-pg.full.hal` | `b24ec063312dae2a76bc58128ff6fed08aa2e15ba2b40f8328ce85cdb96d9298` | — |
| `cleaned_cactus/gr-pg/green-rice-pg.gbz` | `c6414a10eb53fd61008e9d8cc4f061f1b404ee821aacefce35348c7bf8c4df0c` | — |
| `data/green-rice-pg.vcf.gz` | (not captured in graph manifest; per-trait AF bundles fingerprint vcf independently) | — |
| `og_gene_coords/` (content hash) | `808f7140b5f5decf90ca06e581a7a33067795bbca2b2efb49e69fb6bc03fc6d4` | — |
| `candidate_ogs.txt` | `a578001a9e8f64365041cf3cac7904790f0c335ad4797db6ea5560a3b366d300` | 4067 lines |
| `groupings_all.json` | (version 4; sha256 in Firestore grouping doc) | — |

## Totals

- candidateOgs: 4067
- ogsEmitted:  4067
- ogsSkipped:  0  (by reason: none)
- clustersEmitted: 4226
- graphStatus: ok=4059 empty=0 error=167
- usableTraits: 9 (bacterial_leaf_blight, culm_length, grain_weight, heading_date,
  panicle_length, panicle_number, pre_harvest_sprouting, ripening_rate, spikelets_per_panicle)

## Pointer body (verbatim)

```json
{
  "activeOrthofinderVersion": 6,
  "activeGroupingVersion": 4,
  "generatedAt": "2026-04-21T04:50:07Z",
  "appVersion": "ace7fb0",
  "graphManifest": "og_region_graph/v6_g4/_manifest.json",
  "afManifests": {
    "bacterial_leaf_blight": "og_region_af/v6_g4/bacterial_leaf_blight/_manifest.json",
    "culm_length": "og_region_af/v6_g4/culm_length/_manifest.json",
    "grain_weight": "og_region_af/v6_g4/grain_weight/_manifest.json",
    "heading_date": "og_region_af/v6_g4/heading_date/_manifest.json",
    "panicle_length": "og_region_af/v6_g4/panicle_length/_manifest.json",
    "panicle_number": "og_region_af/v6_g4/panicle_number/_manifest.json",
    "pre_harvest_sprouting": "og_region_af/v6_g4/pre_harvest_sprouting/_manifest.json",
    "ripening_rate": "og_region_af/v6_g4/ripening_rate/_manifest.json",
    "spikelets_per_panicle": "og_region_af/v6_g4/spikelets_per_panicle/_manifest.json"
  }
}
```

## Release decision

Judgment rule (plan 2026-04-20-og-region-release-observability.md §
Release decision algorithm):
1. promote preflight invariant fail → release note is NOT created (SystemExit)
2. any smoke HEAD != 200 → `blocked`
3. validator or smoke has documented waived known-gaps only → `pass-with-known-gaps`
4. all green → `pass`

- **Status: pass-with-known-gaps**
- **Blocking issues:** none
- **Known gaps (waived):**
  - **Python-smoke transient failure:** the promote script's smoke step
    raised `ssl.SSLCertVerificationError` on the macOS Python.org build
    (missing system CA bundle). Not a Firebase issue. All 5 smoke
    targets verified manually via `curl` and returned HTTP 200; see
    Smoke sampling log below. No action required other than the
    follow-up to pin `certifi` into the venv before the next promote.
  - **167 graph_error clusters** (~4% of 4226 clusters): cluster-level
    extraction failures (likely `LIFT_FAIL` or `VG_CHUNK_EMPTY` at
    boundary regions). Documented in graph manifest, surfaced in UI via
    `graphStatus`. Not a release blocker — affected OGs still emit the
    cluster entry with status `error`; consumers render a status badge.
- **Pointer object generation: 1776747007481445**  (overwrite id, not
  content hash)
- Invariants verified at promote time (from stdout):
  - [x] candidateOgs=4067 emitted=4067 skipped=0 (sum ok)
  - [x] ogs dict length=4067 (ok)
  - [x] graph statusCounts sum=4226 clustersEmitted=4226 (ok)
  - [x] AF trait dirs=9 summary=9 perTraitManifest=9 (match)
  - [x] final prefixes empty: og_region_graph/v6_g4/, og_region_af/v6_g4/
  - [x] smoke 5 HEAD 200 (manual curl; Python smoke failed on SSL)

## Smoke sampling log

Sample-based — not full coverage. For the full contract check, see
`verify-og-region-bundle.ts` run log (validator ran green before promote).

- pointer: 200 (returned correct pointer body)
- graph manifest: 200 · 1,593,325 bytes
- AF summary manifest: 200 · 1,128 bytes
- AF per-trait manifest (heading_date): 200 · 761,741 bytes
- sample per-cluster graph (OG0000002/baegilmi_chr02_25655540): 200 · 104,332 bytes
- sample per-cluster AF (heading_date/OG0000002/baegilmi_chr02_25655540): 200 · 12,833 bytes
- Smoke count: 6 HEAD 200

## Notes

- **Runtime:** ~25.4 hours on server for 4067 OGs (PID 1984216,
  batch-region-extract.py). Rate ~2.9 OG/min average.
- **Graph success rate:** 4059/4226 = 96.0% clusters with `graph_ok`.
  167 errors concentrated in boundary/tandem cases; UI surfaces status
  so affected clusters show "graph unavailable" rather than blank.
- **First v2 release on the new pointer scheme.** Legacy dual-read
  fallback in `useOgRegionManifest` can be removed in a follow-up once
  we confirm no consumers rely on the pre-v2 legacy path.
- **Python smoke SSL failure** is a local dev env issue (Python.org
  build missing `certifi` hookup). Before next promote, either:
  (a) pip install `certifi` into the venv and set `SSL_CERT_FILE`, or
  (b) change `_smoke()` in promote-og-region.py to use `requests`
  (which bundles certifi) instead of stdlib urllib.
- **Active features enabled by this release:** OG Detail's
  Anchor-locus Variants tab now has actual data for all 4067
  candidates. Representative-tier clusters display variant tables;
  mixed-tier fold behind a disclosure; nonrepresentative-tier hide by
  default (Show anyway button). Region page's "overlapping OG
  clusters" list now has graph bundles to link into.

# OG region v2 release playbook

Use this to run a new `(orthofinderVersion, groupingVersion)` release of
the og_region v2 bundles. Contract in
`docs/exec-plans/active/2026-04-19-og-region-expansion.md`.

Prereq:
- `data/download_versions.json` already set to the `(of, g)` you intend
  to publish. Generator refuses if this mismatches the live Firestore
  state.
- Remote server has `vg`, `halLiftover`, GBZ, HAL, and VCF in place.
- Local has `service-account.json` and `functions-python/venv`.

## Step 1 — Produce inputs (local)

```bash
npm run prepare:og-region
# → /tmp/og_region_inputs/candidate_ogs.txt       (sha256 sidecar)
# → /tmp/og_region_inputs/groupings_all.json      (sha256 sidecar)
```

The printed sha256 values will also appear in the graph + AF manifests.

## Step 2 — Ship to the server

```bash
HOST="ezy@203.255.11.226"
REMOTE_BASE="/10Gdata/ezy/02_Ongoing_Projects/00_Main/Green_Rice"

scp -P 11019 /tmp/og_region_inputs/candidate_ogs.txt   $HOST:/tmp/
scp -P 11019 /tmp/og_region_inputs/groupings_all.json  $HOST:/tmp/
scp -P 11019 scripts/batch-region-extract.py           $HOST:$REMOTE_BASE/
scp -P 11019 scripts/_cultivars.py scripts/_reference.py  $HOST:$REMOTE_BASE/
scp -P 11019 data/cultivars.json data/reference.json   $HOST:$REMOTE_BASE/data/
```

## Step 3 — Run extractor on the server

```bash
ssh -p 11019 $HOST 'cd /10Gdata/ezy/02_Ongoing_Projects/00_Main/Green_Rice && \
  python3 batch-region-extract.py \
    --og-list /tmp/candidate_ogs.txt \
    --groupings /tmp/groupings_all.json \
    --hal cactus/pg.hal \
    --gbz cactus/pg.gbz \
    --vcf data/green-rice-pg.vcf.gz \
    --gene-coords-dir /path/to/og_gene_coords \
    --of 6 --g 4 \
    --output /tmp/og_region_out \
    --flank 10000 --cluster-cap 5'
```

Rough runtime: a few seconds per cluster × ~1.5 clusters/OG × 4,067 OGs
→ hours. Prefer running under `nohup` / `tmux` / `screen`.

## Step 4 — Pull the staging bundle home

```bash
mkdir -p /tmp/og_region_staging
rsync -e 'ssh -p 11019' -aL \
  $HOST:/tmp/og_region_out/og_region_graph \
  $HOST:/tmp/og_region_out/og_region_af \
  /tmp/og_region_staging/
```

## Step 5 — Validate locally

```bash
npm run check:og-region-bundle /tmp/og_region_staging
```

Exits non-zero on any contract failure. Fix upstream and re-run before
promoting.

## Step 6 — Promote to Firebase

```bash
npm run promote:og-region /tmp/og_region_staging
```

What it does, in order:
1. Pre-flight: final prefixes for `v{of}_g{g}` must be empty.
2. Bulk upload per-cluster graph JSONs (create-if-not-exists).
3. Bulk upload per-cluster AF JSONs.
4. Upload per-trait AF manifests + graph manifest + cross-trait summary.
5. Flip `downloads/_og_region_manifest.json`.
6. Post-promote smoke: pointer + graph manifest + a sample AF manifest
   + one per-cluster graph + one per-cluster AF all fetch 200.

## Step 7 — Commit the release record

Within 24h, commit:

```
docs/releases/og-region-v{of}_g{g}.md
```

with the pointer body, input fingerprints, manifest totals, extractor
git sha, generator timestamp, operator name. This file is the rollback
source of truth — without it, a later pointer rollback is blind.

See `docs/releases/og-region-template.md` for the structure.

## Rollback

Pre-pointer-flip failure: staging stays, final prefixes untouched, old
pointer still valid. No action needed.

Post-pointer-flip but post-smoke failure: re-upload the previous
release's pointer body from its `docs/releases/og-region-v{prev}.md` to
`downloads/_og_region_manifest.json`. The old final prefixes are still
live (Release B hasn't run), so the pointer cleanly points back.

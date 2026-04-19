/**
 * Pre-promote validator for og_region v2 bundles.
 *
 * Input: local staging dir produced by batch-region-extract.py, shape:
 *   <staging>/og_region_graph/<runId>/_manifest.json
 *   <staging>/og_region_graph/<runId>/{og}/{cluster}.json
 *   <staging>/og_region_af/<runId>/_manifest.json
 *   <staging>/og_region_af/<runId>/{trait}/_manifest.json
 *   <staging>/og_region_af/<runId>/{trait}/{og}/{cluster}.json
 *
 * Exits non-zero on any contract failure. See plan §11 for the list.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');

const stagingArg = process.argv[2];
if (!stagingArg) {
  console.error('Usage: verify-og-region-bundle.ts <staging-dir>');
  process.exit(2);
}
const STAGING = resolve(stagingArg);

const errs: string[] = [];
const err = (m: string) => errs.push(m);

// Locate runId dirs (exactly one under each of og_region_graph / og_region_af)
function pickRunDir(prefix: string): string {
  const d = join(STAGING, prefix);
  const dirs = readdirSync(d, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  if (dirs.length !== 1) {
    throw new Error(`Expected exactly one run directory under ${d}, found ${dirs.length}`);
  }
  return join(d, dirs[0]);
}

let GRAPH_ROOT: string;
let AF_ROOT: string;
try {
  GRAPH_ROOT = pickRunDir('og_region_graph');
  AF_ROOT = pickRunDir('og_region_af');
} catch (e) {
  console.error((e as Error).message);
  process.exit(2);
}

// Load manifests
const graphManifest = JSON.parse(readFileSync(join(GRAPH_ROOT, '_manifest.json'), 'utf-8'));
const afSummary = JSON.parse(readFileSync(join(AF_ROOT, '_manifest.json'), 'utf-8'));

// Candidate list (from inputs dir — sibling of staging or explicit path).
// The extractor stamps `candidateListSha256` but the list is not inside
// the staging bundle. Accept a path via env or default to /tmp/og_region_inputs.
const candPath = process.env.OG_REGION_CANDIDATES
  ?? '/tmp/og_region_inputs/candidate_ogs.txt';
let candidateOgs: string[] = [];
try {
  candidateOgs = readFileSync(candPath, 'utf-8')
    .split('\n').map((s) => s.trim()).filter(Boolean);
} catch {
  err(`candidate list not readable: ${candPath} (set OG_REGION_CANDIDATES to override)`);
}

const usableTraits = Object.keys(afSummary.traits ?? {}).sort();

// ── Load per-trait AF manifests ─────────────────────────────

const afManifests: Record<string, any> = {};
for (const t of usableTraits) {
  const p = join(AF_ROOT, t, '_manifest.json');
  if (!statSync(p, { throwIfNoEntry: false })?.isFile()) {
    err(`missing AF manifest for trait ${t}`);
    continue;
  }
  afManifests[t] = JSON.parse(readFileSync(p, 'utf-8'));
}

// ── Check 1: Completeness ──────────────────────────────────

if (candidateOgs.length > 0) {
  const seen = new Set(Object.keys(graphManifest.ogs ?? {}));
  for (const og of candidateOgs) {
    if (!seen.has(og)) err(`candidate ${og} missing from graph manifest ogs`);
  }
  if (graphManifest.totals.candidateOgs !== candidateOgs.length) {
    err(
      `graph manifest totals.candidateOgs=${graphManifest.totals.candidateOgs} ` +
        `!= candidate list length ${candidateOgs.length}`,
    );
  }
  const emit = graphManifest.totals.ogsEmitted ?? 0;
  const skip = graphManifest.totals.ogsSkipped ?? 0;
  if (emit + skip !== candidateOgs.length) {
    err(`ogsEmitted + ogsSkipped = ${emit + skip} != candidateOgs ${candidateOgs.length}`);
  }
}

// ── Check 2: Skip reason enum + counts ─────────────────────

const ALLOWED_SKIP = new Set([
  'NO_GENE_COORDS', 'NO_ANCHOR_CULTIVAR', 'NO_CLUSTERS', 'EXTRACTOR_ERROR',
]);
const skipReasonCounts: Record<string, number> = {};
let actualSkipCount = 0;
for (const [og, entry] of Object.entries(graphManifest.ogs ?? {}) as [string, any][]) {
  if (entry.status === 'skipped') {
    actualSkipCount++;
    if (!ALLOWED_SKIP.has(entry.skipReason)) {
      err(`OG ${og} has invalid skipReason=${entry.skipReason}`);
    }
    skipReasonCounts[entry.skipReason] = (skipReasonCounts[entry.skipReason] ?? 0) + 1;
  } else if (entry.status !== 'emitted') {
    err(`OG ${og} has invalid status=${entry.status}`);
  }
}
if (actualSkipCount !== (graphManifest.totals.ogsSkipped ?? 0)) {
  err(`totals.ogsSkipped=${graphManifest.totals.ogsSkipped} != actual ${actualSkipCount}`);
}
for (const [reason, n] of Object.entries(skipReasonCounts)) {
  if ((graphManifest.totals.skipReasonCounts ?? {})[reason] !== n) {
    err(`skipReasonCounts[${reason}]=${(graphManifest.totals.skipReasonCounts ?? {})[reason]} != actual ${n}`);
  }
}

// ── Check 3: Status count integrity ────────────────────────

const statusCounts = graphManifest.totals.statusCounts ?? {};
const statusSum = (statusCounts.graph_ok ?? 0) + (statusCounts.graph_empty ?? 0) + (statusCounts.graph_error ?? 0);
if (statusSum !== (graphManifest.totals.clustersEmitted ?? 0)) {
  err(`graph statusCounts sum ${statusSum} != clustersEmitted ${graphManifest.totals.clustersEmitted}`);
}
for (const t of usableTraits) {
  const m = afManifests[t];
  if (!m) continue;
  const sc = m.totals.statusCounts ?? {};
  const sum = (sc.af_ok ?? 0) + (sc.af_no_variants ?? 0) + (sc.af_unmapped ?? 0) + (sc.af_error ?? 0);
  if (sum !== (m.totals.clustersEmitted ?? 0)) {
    err(`AF[${t}] statusCounts sum ${sum} != clustersEmitted ${m.totals.clustersEmitted}`);
  }
}

// ── Check 4: AF trait set == pointer usable set ────────────

const afManifestTraits = new Set(usableTraits);
for (const t of usableTraits) {
  if (!afManifests[t]) err(`AF summary lists ${t} but its per-trait manifest is missing`);
  else if (!afManifests[t].usable) err(`AF manifest for ${t} has usable=false`);
}

// ── Check 5: AF OG/cluster ⊆ graph emitted ─────────────────

const emittedOgs = new Map<string, Set<string>>();
for (const [og, entry] of Object.entries(graphManifest.ogs ?? {}) as [string, any][]) {
  if (entry.status === 'emitted') {
    emittedOgs.set(og, new Set(entry.clusters.map((c: any) => c.clusterId)));
  }
}
for (const t of usableTraits) {
  const m = afManifests[t];
  if (!m) continue;
  for (const [og, entry] of Object.entries(m.ogs ?? {}) as [string, any][]) {
    const graphClusters = emittedOgs.get(og);
    if (!graphClusters) {
      err(`AF[${t}] OG ${og} not in graph emitted set`);
      continue;
    }
    for (const c of entry.clusters) {
      if (!graphClusters.has(c.clusterId)) {
        err(`AF[${t}] cluster ${og}/${c.clusterId} not in graph manifest`);
      }
    }
  }
}

// ── Check 6: Version echo ──────────────────────────────────

function walk(d: string): string[] {
  const out: string[] = [];
  (function r(x: string) {
    for (const e of readdirSync(x, { withFileTypes: true })) {
      const p = join(x, e.name);
      if (e.isDirectory()) r(p);
      else if (e.name.endsWith('.json') && e.name !== '_manifest.json') out.push(p);
    }
  })(d);
  return out;
}
for (const p of walk(GRAPH_ROOT)) {
  const j = JSON.parse(readFileSync(p, 'utf-8'));
  if (j.orthofinderVersion !== graphManifest.orthofinderVersion) {
    err(`${p} orthofinderVersion mismatch`);
  }
  if (j.schemaVersion !== 2) err(`${p} schemaVersion != 2`);
}
for (const t of usableTraits) {
  const m = afManifests[t];
  if (!m) continue;
  for (const p of walk(join(AF_ROOT, t))) {
    const j = JSON.parse(readFileSync(p, 'utf-8'));
    if (j.orthofinderVersion !== m.orthofinderVersion) err(`${p} orthofinderVersion mismatch`);
    if (j.groupingVersion !== m.groupingVersion) err(`${p} groupingVersion mismatch`);
    if (j.trait !== t) err(`${p} trait mismatch`);
    if (j.schemaVersion !== 2) err(`${p} schemaVersion != 2`);
  }
}

// ── Check 7: Input fingerprint identity ────────────────────

const gfp = graphManifest.inputFingerprints ?? {};
for (const t of usableTraits) {
  const m = afManifests[t];
  if (!m) continue;
  const afp = m.inputFingerprints ?? {};
  if (gfp.gbz?.sha256 && afp.vcf?.sha256 === gfp.gbz.sha256) {
    // no-op; different inputs, just documenting
  }
  // VCF fingerprint should appear identically across all AF manifests.
  if (afp.vcf?.sha256 !== afManifests[usableTraits[0]].inputFingerprints.vcf.sha256) {
    err(`AF[${t}] vcf fingerprint differs from AF[${usableTraits[0]}]`);
  }
}

// ── Check 8: No orphan files ───────────────────────────────

for (const p of walk(GRAPH_ROOT)) {
  // path: .../og_region_graph/<runId>/{og}/{cluster}.json
  const parts = p.split('/');
  const cluster = parts[parts.length - 1].replace(/\.json$/, '');
  const og = parts[parts.length - 2];
  const entry = graphManifest.ogs?.[og];
  if (!entry || entry.status !== 'emitted') {
    err(`orphan graph file: ${p}`);
    continue;
  }
  if (!entry.clusters.find((c: any) => c.clusterId === cluster)) {
    err(`orphan graph cluster file: ${p}`);
  }
}
for (const t of usableTraits) {
  const m = afManifests[t];
  if (!m) continue;
  for (const p of walk(join(AF_ROOT, t))) {
    const parts = p.split('/');
    const cluster = parts[parts.length - 1].replace(/\.json$/, '');
    const og = parts[parts.length - 2];
    const entry = m.ogs?.[og];
    if (!entry) {
      err(`orphan AF file: ${p}`);
      continue;
    }
    if (!entry.clusters.find((c: any) => c.clusterId === cluster)) {
      err(`orphan AF cluster file: ${p}`);
    }
  }
}

// ── Check 9: Cross-trait summary matches per-trait manifests ──

for (const t of usableTraits) {
  const s = afSummary.traits[t];
  const m = afManifests[t];
  if (!s || !m) continue;
  if (s.ogsEmitted !== m.totals.ogsEmitted)
    err(`summary.traits.${t}.ogsEmitted != per-trait manifest`);
  if (s.clustersEmitted !== m.totals.clustersEmitted)
    err(`summary.traits.${t}.clustersEmitted != per-trait manifest`);
}

// ── Report ─────────────────────────────────────────────────

if (errs.length > 0) {
  console.error(`\n\x1b[31m✗ ${errs.length} validation error(s):\x1b[0m\n`);
  for (const e of errs) console.error(`  ${e}`);
  process.exit(1);
}
console.log(
  `\n\x1b[32m✓ og_region bundle valid — ` +
    `${graphManifest.totals.ogsEmitted}/${graphManifest.totals.candidateOgs} emitted, ` +
    `${graphManifest.totals.clustersEmitted} clusters, ${usableTraits.length} traits\x1b[0m\n`,
);

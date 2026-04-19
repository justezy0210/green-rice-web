/**
 * Verify a download-bundle staging directory against rev2 §10.
 *
 * Usage:
 *   npx tsx scripts/verify-download-bundles.ts <staging-dir>
 *
 * Checks:
 *   1. Every trait in data/traits.json has a per-trait directory.
 *   2. Every per-trait dir holds the 3 Tier-A files + README.md.
 *   3. candidates.tsv header matches the locked column list.
 *   4. BED score column passes a bedtools sort smoke test (if bedtools
 *      on PATH); else static "chr/start ordered" check.
 *   5. Copycount matrix has exactly (1 + pangenome cultivar count) columns.
 *   6. Every TSV/BED first non-blank line matches /^#green_rice_db_/.
 *   7. _manifest.json SHA256 values match file bytes.
 *   8. Cross-trait file exists with expected header.
 *   9. Scope-word audit: forbid {marker, primer, KASP, CAPS, InDel,
 *      MAS, GEBV, GS} outside "not <word>(-|_)ready" patterns.
 *
 * Non-zero exit on any failure. Stdin is not read.
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');

const stagingArg = process.argv[2];
if (!stagingArg) {
  console.error('Usage: verify-download-bundles.ts <staging-dir>');
  process.exit(2);
}
const STAGING = resolve(stagingArg);
if (!statSync(STAGING, { throwIfNoEntry: false })?.isDirectory()) {
  console.error(`Not a directory: ${STAGING}`);
  process.exit(2);
}

const errors: string[] = [];
const err = (msg: string) => errors.push(msg);

// ─── Load SSOT + staging manifest ───────────────────────────

const traitsJson = JSON.parse(readFileSync(resolve(REPO_ROOT, 'data/traits.json'), 'utf-8'));
const cultivarsJson = JSON.parse(readFileSync(resolve(REPO_ROOT, 'data/cultivars.json'), 'utf-8'));
const traitIds: string[] = (traitsJson.traits as Array<{ id: string }>).map((t) => t.id);
const pangenomeCount = (cultivarsJson.cultivars as Array<{ pangenome?: boolean }>).filter(
  (c) => c.pangenome,
).length;

// Version tag comes from the STAGING manifest, not from data/
// download_versions.json. The two normally agree, but --pair override
// on the generator, or verifying an older bundle, would break the
// repo-SSOT binding. Staging manifest is authoritative for its own dir.
const stagingManifestPath = join(STAGING, '_manifest.json');
if (!statSync(stagingManifestPath, { throwIfNoEntry: false })?.isFile()) {
  console.error(`Staging _manifest.json missing at ${stagingManifestPath}`);
  process.exit(2);
}
const stagingManifest = JSON.parse(readFileSync(stagingManifestPath, 'utf-8')) as {
  orthofinderVersion: number;
  groupingVersion: number;
  traits: Record<string, { files: Record<string, { size: number; sha256: string }>; usable: boolean }>;
  crossTrait: { files: Record<string, { size: number; sha256: string }> };
};
const of: number = stagingManifest.orthofinderVersion;
const g: number = stagingManifest.groupingVersion;
const versionTag = `v${of}_g${g}`;

// ─── Locked column lists ────────────────────────────────────

const CANDIDATES_COLUMNS = [
  'trait', 'ogId', 'rank', 'pValue', 'pValueAdjBH', 'log2FC',
  'effectSize', 'effectSizeSign', 'groupLabels', 'nPerGroup', 'nMissing',
  'irgspRepresentative', 'description', 'llmCategory', 'analysisStatus',
  'orthofinderVersion', 'groupingVersion',
];

const CROSS_TRAIT_COLUMNS = [
  'trait', 'ogId', 'rank', 'pValue', 'pValueAdjBH', 'log2FC',
  'effectSize', 'effectSizeSign', 'irgspRepresentative', 'description',
  'orthofinderVersion', 'groupingVersion',
];

const BED_COLUMNS = [
  'chrom', 'start', 'end', 'name', 'score', 'strand',
  'ogId', 'transcriptId', 'source',
];

// ─── Helpers ────────────────────────────────────────────────

function readHeaderRow(path: string): string | null {
  const text = readFileSync(path, 'utf-8');
  for (const line of text.split('\n')) {
    const trimmed = line.replace(/\r$/, '');
    if (trimmed === '') continue;
    if (trimmed.startsWith('#')) continue;
    return trimmed;
  }
  return null;
}

function readAllCommentLines(path: string): string[] {
  const lines = readFileSync(path, 'utf-8').split('\n');
  const out: string[] = [];
  for (const raw of lines) {
    const line = raw.replace(/\r$/, '');
    if (line === '') continue;
    if (line.startsWith('#')) {
      out.push(line);
      continue;
    }
    break;
  }
  return out;
}

function firstNonBlankLine(path: string): string {
  const text = readFileSync(path, 'utf-8');
  for (const line of text.split('\n')) {
    const trimmed = line.replace(/\r$/, '');
    if (trimmed !== '') return trimmed;
  }
  return '';
}

function sha256(path: string): string {
  const h = createHash('sha256');
  h.update(readFileSync(path));
  return h.digest('hex');
}

// ─── Check 1 + 2: per-trait directories and files ───────────

const tierARequired = [
  'candidates.tsv',
  'candidate_irgsp_coords.bed',
  'candidate_copycount_matrix.tsv',
  'README.md',
];

for (const t of traitIds) {
  const dir = join(STAGING, 'traits', t, versionTag);
  const st = statSync(dir, { throwIfNoEntry: false });
  if (!st?.isDirectory()) {
    err(`missing trait directory: ${dir}`);
    continue;
  }
  for (const name of tierARequired) {
    const p = join(dir, name);
    if (!statSync(p, { throwIfNoEntry: false })?.isFile()) {
      err(`missing file: traits/${t}/${versionTag}/${name}`);
    }
  }
}

// ─── Check 3: candidates.tsv header ─────────────────────────

for (const t of traitIds) {
  const p = join(STAGING, 'traits', t, versionTag, 'candidates.tsv');
  if (!statSync(p, { throwIfNoEntry: false })?.isFile()) continue;
  const header = readHeaderRow(p);
  const expected = CANDIDATES_COLUMNS.join('\t');
  if (header !== expected) {
    err(`candidates.tsv header mismatch for ${t}\n    expected: ${expected}\n    got:      ${header}`);
  }
}

// ─── Check 4: BED header + bedtools smoke (optional) ────────

let hasBedtools = false;
try {
  execFileSync('bedtools', ['--version'], { stdio: 'ignore' });
  hasBedtools = true;
} catch {
  // bedtools optional — static checks still run
}
const SAMPLE_BED = resolve(REPO_ROOT, 'scripts/fixtures/sample.bed');

for (const t of traitIds) {
  const p = join(STAGING, 'traits', t, versionTag, 'candidate_irgsp_coords.bed');
  if (!statSync(p, { throwIfNoEntry: false })?.isFile()) continue;
  const header = readHeaderRow(p);
  const expected = BED_COLUMNS.join('\t');
  if (header !== expected) {
    err(`BED header mismatch for ${t}\n    expected: ${expected}\n    got:      ${header}`);
  }
  if (hasBedtools) {
    // Only smoke test if the file actually has data rows
    const lines = readFileSync(p, 'utf-8').split('\n').filter((l) => l && !l.startsWith('#'));
    if (lines.length > 1) {
      try {
        execFileSync('bedtools', ['sort', '-i', p], { stdio: 'ignore' });
      } catch {
        err(`bedtools sort failed for ${t}`);
      }
      // Intersect against a fixture spanning every IRGSP chromosome so
      // a trait whose candidates happen to cluster on a single chrom
      // still produces a non-empty intersect result. The check is:
      // "valid BED → non-empty intersect against genome-wide fixture".
      try {
        const out = execFileSync('bedtools', ['intersect', '-a', SAMPLE_BED, '-b', p], {
          encoding: 'utf-8',
        });
        if (out.trim() === '') {
          err(`bedtools intersect produced 0 rows for ${t} — BED file may be empty or mis-chromed`);
        }
      } catch {
        err(`bedtools intersect failed for ${t}`);
      }
    }
  }
}

// ─── Check 5: Copycount matrix column count ─────────────────

for (const t of traitIds) {
  const p = join(STAGING, 'traits', t, versionTag, 'candidate_copycount_matrix.tsv');
  if (!statSync(p, { throwIfNoEntry: false })?.isFile()) continue;
  const header = readHeaderRow(p);
  if (!header) {
    err(`copycount matrix empty for ${t}`);
    continue;
  }
  const cols = header.split('\t');
  const expected = 1 + pangenomeCount;
  if (cols.length !== expected) {
    err(`copycount matrix column count for ${t}: expected ${expected}, got ${cols.length}`);
  }
  if (cols[0] !== 'ogId') {
    err(`copycount matrix first column must be "ogId" for ${t}, got "${cols[0]}"`);
  }
}

// ─── Check 6: first-line #green_rice_db_ prefix ─────────────

function allTsvBedFiles(): string[] {
  const found: string[] = [];
  function walk(d: string) {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      const s = statSync(p);
      if (s.isDirectory()) walk(p);
      else if (/\.(tsv|bed)$/.test(name)) found.push(p);
    }
  }
  walk(STAGING);
  return found;
}

for (const f of allTsvBedFiles()) {
  const first = firstNonBlankLine(f);
  if (!/^#green_rice_db_/.test(first)) {
    err(`first non-blank line does not match /^#green_rice_db_/: ${f}`);
  }
}

// ─── Check 7: manifest SHA256 parity ────────────────────────

for (const [traitId, entry] of Object.entries(stagingManifest.traits)) {
  for (const [fname, meta] of Object.entries(entry.files)) {
    const p = join(STAGING, 'traits', traitId, versionTag, fname);
    if (!statSync(p, { throwIfNoEntry: false })?.isFile()) {
      err(`manifest references missing file: traits/${traitId}/${versionTag}/${fname}`);
      continue;
    }
    if (sha256(p) !== meta.sha256) err(`sha256 mismatch: traits/${traitId}/${versionTag}/${fname}`);
    if (statSync(p).size !== meta.size) err(`size mismatch: traits/${traitId}/${versionTag}/${fname}`);
  }
}
for (const [fname, meta] of Object.entries(stagingManifest.crossTrait.files)) {
  const p = join(STAGING, 'cross-trait', versionTag, fname);
  if (!statSync(p, { throwIfNoEntry: false })?.isFile()) {
    err(`manifest references missing cross-trait file: ${fname}`);
    continue;
  }
  if (sha256(p) !== meta.sha256) err(`sha256 mismatch: cross-trait/${fname}`);
  if (statSync(p).size !== meta.size) err(`size mismatch: cross-trait/${fname}`);
}

// ─── Check 8: cross-trait file header + row-count parity ────

function countDataRows(path: string): number {
  const text = readFileSync(path, 'utf-8');
  let n = 0;
  let sawHeader = false;
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\r$/, '');
    if (line === '' || line.startsWith('#')) continue;
    if (!sawHeader) { sawHeader = true; continue; }
    n += 1;
  }
  return n;
}

const crossPath = join(STAGING, 'cross-trait', versionTag, 'cross_trait_candidates.tsv');
if (!statSync(crossPath, { throwIfNoEntry: false })?.isFile()) {
  err(`cross-trait file missing: ${crossPath}`);
} else {
  const h = readHeaderRow(crossPath);
  if (h !== CROSS_TRAIT_COLUMNS.join('\t')) {
    err(`cross-trait header mismatch\n    expected: ${CROSS_TRAIT_COLUMNS.join('\t')}\n    got:      ${h}`);
  }

  // Row-count parity: sum of per-trait candidates.tsv data rows
  // (usable=true traits only — usable=false contribute 0 rows) must
  // equal the cross-trait row count.
  let expectedCross = 0;
  for (const t of traitIds) {
    const entry = stagingManifest.traits[t];
    if (!entry?.usable) continue;
    const p = join(STAGING, 'traits', t, versionTag, 'candidates.tsv');
    if (statSync(p, { throwIfNoEntry: false })?.isFile()) {
      expectedCross += countDataRows(p);
    }
  }
  const actualCross = countDataRows(crossPath);
  if (expectedCross !== actualCross) {
    err(
      `cross-trait row count mismatch: sum of per-trait candidates.tsv rows = ${expectedCross}, ` +
        `cross_trait_candidates.tsv rows = ${actualCross}`,
    );
  }
}

// ─── Check 8b: BED rows sorted (chrom asc, start asc) ──────
// When bedtools is absent this is the only integrity check on ordering.

function readBedDataRows(path: string): Array<{ chrom: string; start: number }> {
  const rows: Array<{ chrom: string; start: number }> = [];
  const text = readFileSync(path, 'utf-8');
  let sawHeader = false;
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\r$/, '');
    if (line === '' || line.startsWith('#')) continue;
    if (!sawHeader) { sawHeader = true; continue; }
    const parts = line.split('\t');
    rows.push({ chrom: parts[0], start: parseInt(parts[1], 10) });
  }
  return rows;
}

for (const t of traitIds) {
  const p = join(STAGING, 'traits', t, versionTag, 'candidate_irgsp_coords.bed');
  if (!statSync(p, { throwIfNoEntry: false })?.isFile()) continue;
  const rows = readBedDataRows(p);
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1];
    const cur = rows[i];
    const chromCmp = prev.chrom < cur.chrom ? -1 : prev.chrom > cur.chrom ? 1 : 0;
    if (chromCmp > 0 || (chromCmp === 0 && prev.start > cur.start)) {
      err(`BED not sorted (chrom asc, start asc) for ${t} at row ${i + 1}`);
      break;
    }
  }
}

// ─── Check 9: scope-word audit ──────────────────────────────
// Forbid {marker, primer, KASP, CAPS, InDel, MAS, GEBV, GS} outside
// "not <word>(-|_)ready" or comment metadata like "not_marker_ready".

const FORBIDDEN = /\b(marker|primer|KASP|CAPS|InDel|MAS|GEBV|GS)\b/gi;
const ALLOWED_NEG = /\bnot[_\s-](marker|primer|kasp|caps|indel|mas|gebv|gs)[-_\s]?ready\b/gi;

function scopeAudit(path: string) {
  const text = readFileSync(path, 'utf-8');
  const cleaned = text.replace(ALLOWED_NEG, '');
  const hits = cleaned.match(FORBIDDEN);
  if (hits && hits.length > 0) {
    const examples = hits.slice(0, 3).join(', ');
    err(`scope-word audit failed: ${path} contains ${hits.length} hit(s) (e.g. ${examples})`);
  }
}

// Audit only generated data files (TSV, BED). README.md is where we
// INTENTIONALLY declare what is out of scope — banning the words there
// would make the scope declaration itself impossible.
for (const f of allTsvBedFiles()) scopeAudit(f);

// ─── Report ─────────────────────────────────────────────────

if (errors.length > 0) {
  console.error(`\n\x1b[31m✗ ${errors.length} verification error(s):\x1b[0m\n`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}

console.log(`\n\x1b[32m✓ Download bundle verified (${traitIds.length} traits, ${versionTag})\x1b[0m\n`);

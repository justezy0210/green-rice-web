/**
 * Assert that data/traits.json matches the TraitId union in
 * src/types/traits.ts, and that every entry has the required fields with
 * values from the allowed enums. This is the JSON↔union bridge that the
 * TypeScript compiler cannot check on its own.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');

const TRAITS_JSON = resolve(REPO_ROOT, 'data/traits.json');
const DOWNLOAD_VERSIONS_JSON = resolve(REPO_ROOT, 'data/download_versions.json');
const TRAIT_ID_UNION_FILE = resolve(REPO_ROOT, 'src/types/traits.ts');

const REQUIRED_FIELDS = ['id', 'label', 'type', 'keys', 'direction', 'labels', 'unit'];
const TYPES = new Set(['multi-env', 'single-continuous', 'binary']);
const DIRECTIONS = new Set(['higher-is-more', 'higher-is-less', 'not-applicable']);

interface TraitEntry {
  id: string;
  label: string;
  type: string;
  keys: string[];
  direction: string;
  labels: { low: string; high: string };
  unit: string;
}

function extractUnionMembers(src: string): string[] {
  const m = src.match(/export\s+type\s+TraitId\s*=\s*([\s\S]*?);/);
  if (!m) throw new Error('TraitId union not found in src/types/traits.ts');
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

const raw = JSON.parse(readFileSync(TRAITS_JSON, 'utf-8'));
const entries = raw.traits as TraitEntry[];
if (!Array.isArray(entries)) {
  throw new Error(`data/traits.json: missing or non-array "traits"`);
}

const unionMembers = extractUnionMembers(readFileSync(TRAIT_ID_UNION_FILE, 'utf-8'));

const errors: string[] = [];

// Per-entry structural checks
const seen = new Set<string>();
for (let i = 0; i < entries.length; i++) {
  const e = entries[i];
  for (const f of REQUIRED_FIELDS) {
    if (!(f in e)) errors.push(`traits[${i}] (${e.id ?? '?'}): missing field "${f}"`);
  }
  if (e.type && !TYPES.has(e.type)) {
    errors.push(`traits[${i}] (${e.id}): unknown type "${e.type}"`);
  }
  if (e.direction && !DIRECTIONS.has(e.direction)) {
    errors.push(`traits[${i}] (${e.id}): unknown direction "${e.direction}"`);
  }
  if (e.labels && (typeof e.labels.low !== 'string' || typeof e.labels.high !== 'string')) {
    errors.push(`traits[${i}] (${e.id}): labels.low and labels.high must be strings`);
  }
  if (e.keys && (!Array.isArray(e.keys) || e.keys.length === 0)) {
    errors.push(`traits[${i}] (${e.id}): keys must be a non-empty array`);
  }
  if (e.id) {
    if (seen.has(e.id)) errors.push(`duplicate trait id "${e.id}"`);
    seen.add(e.id);
  }
}

// TraitId union ↔ JSON set parity
const jsonIds = new Set(entries.map((e) => e.id));
const unionSet = new Set(unionMembers);
for (const id of jsonIds) {
  if (!unionSet.has(id)) errors.push(`trait id "${id}" present in data/traits.json but not in TraitId union`);
}
for (const member of unionSet) {
  if (!jsonIds.has(member)) errors.push(`TraitId union member "${member}" not found in data/traits.json`);
}

// download_versions.json schema check
try {
  const dv = JSON.parse(readFileSync(DOWNLOAD_VERSIONS_JSON, 'utf-8'));
  const of = dv.activeOrthofinderVersion;
  const gv = dv.activeGroupingVersion;
  if (!Number.isInteger(of) || of <= 0) {
    errors.push(`data/download_versions.json: activeOrthofinderVersion must be a positive integer`);
  }
  if (!Number.isInteger(gv) || gv <= 0) {
    errors.push(`data/download_versions.json: activeGroupingVersion must be a positive integer`);
  }
  if (typeof dv.updatedAt !== 'string' || !dv.updatedAt) {
    errors.push(`data/download_versions.json: updatedAt must be a non-empty string`);
  }
} catch (e) {
  errors.push(`data/download_versions.json: ${(e as Error).message}`);
}

if (errors.length > 0) {
  console.error('\n\x1b[31m✗ SSOT schema errors:\x1b[0m\n');
  for (const e of errors) console.error(`  ${e}`);
  console.error('');
  process.exit(1);
}

console.log(`\n\x1b[32m✓ data/traits.json matches TraitId union (${jsonIds.size} traits) · download_versions.json valid\x1b[0m\n`);

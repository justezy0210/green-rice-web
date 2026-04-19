/**
 * Verify that functions-python/generated_manifests/*.json are byte-for-byte
 * identical to data/*.json. Non-zero exit on drift, with a diff-friendly
 * message on stderr.
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');
const SRC_DIR = resolve(REPO_ROOT, 'data');
const DEST_DIR = resolve(REPO_ROOT, 'functions-python/generated_manifests');

const MANIFESTS = ['traits.json', 'cultivars.json', 'reference.json'];

const stale: string[] = [];
for (const name of MANIFESTS) {
  const src = resolve(SRC_DIR, name);
  const dst = resolve(DEST_DIR, name);
  if (!existsSync(dst)) {
    stale.push(`${name}: missing generated copy`);
    continue;
  }
  const a = readFileSync(src);
  const b = readFileSync(dst);
  if (!a.equals(b)) {
    stale.push(`${name}: generated copy differs from data/${name}`);
  }
}

if (stale.length > 0) {
  console.error('\n\x1b[31m✗ Manifest freshness check failed:\x1b[0m\n');
  for (const msg of stale) console.error(`  ${msg}`);
  console.error('\n  Run `npm run sync:manifests` and commit the regenerated files.\n');
  process.exit(1);
}

console.log('\n\x1b[32m✓ Manifests are fresh\x1b[0m\n');

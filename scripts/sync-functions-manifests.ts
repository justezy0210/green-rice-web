/**
 * Byte-for-byte copy of data/*.json into functions-python/generated_manifests/
 * so the Firebase Functions deploy bundle carries them. No JSON parse, no
 * re-serialise — schema validation lives in check-traits-schema and the
 * Python loader tests.
 */

import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');
const SRC_DIR = resolve(REPO_ROOT, 'data');
const DEST_DIR = resolve(REPO_ROOT, 'functions-python/generated_manifests');

const MANIFESTS = ['traits.json', 'cultivars.json', 'reference.json'];

mkdirSync(DEST_DIR, { recursive: true });

for (const name of MANIFESTS) {
  const src = resolve(SRC_DIR, name);
  const dst = resolve(DEST_DIR, name);
  copyFileSync(src, dst);
  console.log(`  ${name}`);
}

console.log(`Synced ${MANIFESTS.length} manifests → functions-python/generated_manifests/`);

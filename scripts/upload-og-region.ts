/**
 * Upload batch-region-extract output to Firebase Storage under og_region/.
 *
 * Auth: Google Application Default Credentials (run `firebase login:ci` or
 * `gcloud auth application-default login` once).
 *
 * Usage:
 *   npx tsx scripts/upload-og-region.ts /tmp/og_region_download
 */

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { config } from 'dotenv';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { ogRegionManifestPath, ogRegionPath } from '../src/lib/storage-paths';

config();

const BUCKET = process.env.VITE_FIREBASE_STORAGE_BUCKET;
const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID;

async function main() {
  if (!BUCKET || !PROJECT_ID) {
    console.error(
      'Missing VITE_FIREBASE_STORAGE_BUCKET or VITE_FIREBASE_PROJECT_ID in .env',
    );
    process.exit(1);
  }
  const root = process.argv[2];
  if (!root) {
    console.error('Usage: upload-og-region.ts <local-output-dir>');
    process.exit(1);
  }

  initializeApp({
    credential: applicationDefault(),
    storageBucket: BUCKET,
    projectId: PROJECT_ID,
  });

  const bucket = getStorage().bucket();
  const entries = readdirSync(root);

  let ogCount = 0;
  let fileCount = 0;
  for (const entry of entries) {
    const local = join(root, entry);
    const stat = statSync(local);
    if (stat.isFile() && entry === '_manifest.json') {
      await upload(bucket, local, ogRegionManifestPath());
      fileCount++;
      continue;
    }
    if (!stat.isDirectory()) continue;
    if (!entry.startsWith('OG')) continue;
    const ogId = entry;
    const clusterFiles = readdirSync(local).filter((f) => f.endsWith('.json'));
    for (const cf of clusterFiles) {
      const clusterId = cf.replace(/\.json$/, '');
      await upload(bucket, join(local, cf), ogRegionPath(ogId, clusterId));
      fileCount++;
    }
    ogCount++;
    if (ogCount % 10 === 0) {
      console.log(`  ${ogCount} OGs · ${fileCount} files uploaded`);
    }
  }

  console.log(`\nDone: ${ogCount} OGs, ${fileCount} files total.`);
}

async function upload(bucket: ReturnType<typeof getStorage>['bucket'] extends () => infer B ? B : never, local: string, dest: string) {
  await bucket.upload(local, {
    destination: dest,
    metadata: {
      contentType: 'application/json',
      cacheControl: 'public, max-age=3600',
    },
  });
  // Keep logs light; print on errors only
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

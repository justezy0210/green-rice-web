/**
 * Build a public download URL for a Firebase Storage object without
 * calling `getDownloadURL` (which does an extra REST round-trip to
 * fetch a download token). Storage paths under rules `allow read: if
 * true` — `genomes/**`, `downloads/**`, etc. — are directly fetchable
 * via `?alt=media` with no token, so we can hand the browser a
 * ready-to-click link without a network wait.
 *
 * If a future path ever uses token-based access, call `getDownloadURL`
 * for that one explicitly. The default is the public shape.
 */

const BUCKET = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
if (!BUCKET) {
  throw new Error('VITE_FIREBASE_STORAGE_BUCKET is not set.');
}

/** Encode each path segment with encodeURIComponent (so "/" inside the
 * storage path is percent-encoded — Firebase's REST shape). */
function encodeStoragePath(path: string): string {
  return encodeURIComponent(path);
}

export function publicDownloadUrl(storagePath: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeStoragePath(storagePath)}?alt=media`;
}

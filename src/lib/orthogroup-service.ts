import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { ref as storageRef, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import {
  orthofinderBaegilmiAnnotationPath,
  orthofinderOgCategoriesPath,
  orthofinderOgMembersPath,
} from '@/lib/storage-paths';
import type { OrthogroupDiffDocument, OrthogroupDiffPayload } from '@/types/orthogroup';
// Region-adjacent artifacts (gene coords, AF) live in og-region-service.ts
export {
  fetchOgGeneCoords,
  fetchOgAlleleFreq,
} from '@/lib/og-region-service';
import type { TraitId } from '@/types/grouping';
import type {
  BaegilmiGeneAnnotation,
  OgMembersChunk,
} from '@/types/orthogroup-artifacts';

// ─────────────────────────────────────────────────────────────
// Firestore: diff doc subscription (unchanged)
// ─────────────────────────────────────────────────────────────

export function subscribeOrthogroupDiff(
  traitId: TraitId,
  callback: (doc: OrthogroupDiffDocument | null) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, 'orthogroup_diffs', traitId),
    (snap) => callback(snap.exists() ? (snap.data() as OrthogroupDiffDocument) : null),
    () => callback(null),
  );
}

// ─────────────────────────────────────────────────────────────
// Storage artifacts: chunked gene members + annotation snapshot
// Cache strategy (per round-2 review):
//   - Resolved data only lives in the cache (no in-flight Promises).
//   - In-flight requests tracked separately so new callers can cancel or
//     wait; if a request rejects/aborts, it leaves no poison in the cache.
// ─────────────────────────────────────────────────────────────

const _chunkData = new Map<string, OgMembersChunk>();          // `v${N}:${chunk}` → data
const _annotationData = new Map<number, BaegilmiGeneAnnotation>();
const _diffPayloadData = new Map<string, OrthogroupDiffPayload>(); // storagePath → payload
// Inflight maps now hold the shared Promise itself, not an AbortController.
// Concurrent callers join the same Promise instead of cancelling each other —
// the prior abort-and-restart pattern made the first caller see a spurious
// AbortError when a second caller arrived for the same key.
const _chunkInflight = new Map<string, Promise<OgMembersChunk>>();
const _annotationInflight = new Map<number, Promise<BaegilmiGeneAnnotation>>();
const _diffPayloadInflight = new Map<string, Promise<OrthogroupDiffPayload>>();

export class NotFoundError extends Error {
  constructor(path: string) {
    super(`Not found: ${path}`);
    this.name = 'NotFoundError';
  }
}

export function chunkKeyForOg(ogId: string): string {
  const m = ogId.match(/^OG(\d+)$/);
  if (!m) throw new Error(`Invalid orthogroup id: ${ogId}`);
  return Math.floor(parseInt(m[1], 10) / 1000).toString().padStart(3, '0');
}

export function fetchOgChunk(
  version: number,
  chunkKey: string,
  signal?: AbortSignal,
): Promise<OgMembersChunk> {
  const cacheKey = `v${version}:${chunkKey}`;
  const cached = _chunkData.get(cacheKey);
  if (cached) return Promise.resolve(cached);
  const shared = dedupedFetch(cacheKey, _chunkInflight, _chunkData, () =>
    downloadJson<OgMembersChunk>(orthofinderOgMembersPath(version, chunkKey)),
  );
  return attachCallerSignal(shared, signal);
}

export function fetchBaegilmiAnnotation(
  version: number,
  signal?: AbortSignal,
): Promise<BaegilmiGeneAnnotation> {
  const cached = _annotationData.get(version);
  if (cached) return Promise.resolve(cached);
  const shared = dedupedFetch(
    version,
    _annotationInflight,
    _annotationData,
    () => downloadJson<BaegilmiGeneAnnotation>(orthofinderBaegilmiAnnotationPath(version)),
  );
  return attachCallerSignal(shared, signal);
}

// ─────────────────────────────────────────────────────────────
// LLM-precomputed OG categories
// ─────────────────────────────────────────────────────────────

export interface OgCategoriesData {
  version: number;
  method: string;
  classifiedAt: string;
  totalClassified: number;
  categories: Record<string, { p: string; s: string | null }>;
}

const _ogCategoriesData = new Map<number, OgCategoriesData>();
const _ogCategoriesInflight = new Map<number, Promise<OgCategoriesData>>();

export async function fetchOgCategories(
  orthofinderVersion: number,
  signal?: AbortSignal,
): Promise<OgCategoriesData | null> {
  const cached = _ogCategoriesData.get(orthofinderVersion);
  if (cached) return cached;
  const shared = dedupedFetch(
    orthofinderVersion,
    _ogCategoriesInflight,
    _ogCategoriesData,
    () => downloadJson<OgCategoriesData>(orthofinderOgCategoriesPath(orthofinderVersion)),
  );
  try {
    return await attachCallerSignal(shared, signal);
  } catch {
    // Missing file is a legitimate empty state — fallback to regex
    // categorisation. AbortError from caller-signal propagation is
    // also collapsed to null; callers that care should re-issue.
    return null;
  }
}

// Region artifacts moved to og-region-service.ts (see re-exports at top of file)

export function fetchOrthogroupDiffPayload(
  storagePath: string,
  signal?: AbortSignal,
): Promise<OrthogroupDiffPayload> {
  const cached = _diffPayloadData.get(storagePath);
  if (cached) return Promise.resolve(cached);
  const shared = dedupedFetch(
    storagePath,
    _diffPayloadInflight,
    _diffPayloadData,
    async () => {
      const raw = await downloadJson<unknown>(storagePath);
      if (!isDiffPayload(raw)) {
        throw new Error(`Invalid diff payload shape at ${storagePath}`);
      }
      return raw;
    },
  );
  return attachCallerSignal(shared, signal);
}

function isDiffPayload(v: unknown): v is OrthogroupDiffPayload {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.schemaVersion === 'number' &&
    typeof o.traitId === 'string' &&
    Array.isArray(o.entries) &&
    Array.isArray(o.groupLabels) &&
    typeof o.entryCount === 'number' &&
    typeof o.passedCount === 'number' &&
    typeof o.selectionMode === 'string' &&
    typeof o.computedAt === 'string' &&
    typeof o.orthofinderVersion === 'number' &&
    typeof o.groupingVersion === 'number'
  );
}

// ─────────────────────────────────────────────────────────────
// Internals
// ─────────────────────────────────────────────────────────────

async function downloadJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const url = await getDownloadURL(storageRef(storage, path));
  const res = await fetch(url, { signal });
  if (res.status === 404) throw new NotFoundError(path);
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
  return (await res.json()) as T;
}

/**
 * Wrap a shared fetch Promise so this specific caller's `signal` rejects
 * the caller's view with an AbortError without disturbing the shared
 * underlying request (other waiters keep going). The wrap drops to a
 * pass-through when the caller passed no signal.
 */
function attachCallerSignal<T>(
  shared: Promise<T>,
  signal: AbortSignal | undefined,
): Promise<T> {
  if (!signal) return shared;
  return new Promise<T>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('aborted', 'AbortError'));
      return;
    }
    const onAbort = () =>
      reject(new DOMException('aborted', 'AbortError'));
    signal.addEventListener('abort', onAbort, { once: true });
    shared.then(
      (v) => {
        signal.removeEventListener('abort', onAbort);
        resolve(v);
      },
      (e) => {
        signal.removeEventListener('abort', onAbort);
        reject(e);
      },
    );
  });
}

/**
 * Promise-dedupe a cached storage fetch. If a concurrent inflight Promise
 * exists for the same key, all callers share it — no abort-and-restart.
 * The shared Promise is only deleted from the inflight map when it
 * settles, so a late caller never resurrects a stale Promise.
 */
function dedupedFetch<K, T>(
  key: K,
  inflight: Map<K, Promise<T>>,
  data: Map<K, T>,
  fetcher: () => Promise<T>,
): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing;
  const promise = fetcher()
    .then((value) => {
      data.set(key, value);
      return value;
    })
    .finally(() => {
      if (inflight.get(key) === promise) inflight.delete(key);
    });
  inflight.set(key, promise);
  return promise;
}

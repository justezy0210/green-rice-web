import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { ref as storageRef, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import type { OrthogroupDiffDocument, OrthogroupDiffPayload } from '@/types/orthogroup';
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
const _chunkInflight = new Map<string, AbortController>();
const _annotationInflight = new Map<number, AbortController>();
const _diffPayloadInflight = new Map<string, AbortController>();

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

export async function fetchOgChunk(
  version: number,
  chunkKey: string,
  signal?: AbortSignal,
): Promise<OgMembersChunk> {
  const cacheKey = `v${version}:${chunkKey}`;
  const cached = _chunkData.get(cacheKey);
  if (cached) return cached;

  // Supersede any in-flight request for the same key
  _chunkInflight.get(cacheKey)?.abort();
  const controller = new AbortController();
  _chunkInflight.set(cacheKey, controller);
  const combined = mergeSignals(signal, controller.signal);

  try {
    const path = `orthofinder/v${version}/og-members/chunk_${chunkKey}.json`;
    const data = await downloadJson<OgMembersChunk>(path, combined);
    _chunkData.set(cacheKey, data);
    return data;
  } finally {
    // Only clear if we're still the active controller (another call may have taken over)
    if (_chunkInflight.get(cacheKey) === controller) {
      _chunkInflight.delete(cacheKey);
    }
  }
}

export async function fetchBaegilmiAnnotation(
  version: number,
  signal?: AbortSignal,
): Promise<BaegilmiGeneAnnotation> {
  const cached = _annotationData.get(version);
  if (cached) return cached;

  _annotationInflight.get(version)?.abort();
  const controller = new AbortController();
  _annotationInflight.set(version, controller);
  const combined = mergeSignals(signal, controller.signal);

  try {
    const path = `orthofinder/v${version}/baegilmi_gene_annotation.json`;
    const data = await downloadJson<BaegilmiGeneAnnotation>(path, combined);
    _annotationData.set(version, data);
    return data;
  } finally {
    if (_annotationInflight.get(version) === controller) {
      _annotationInflight.delete(version);
    }
  }
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
const _ogCategoriesInflight = new Map<number, AbortController>();

export async function fetchOgCategories(
  orthofinderVersion: number,
  signal?: AbortSignal,
): Promise<OgCategoriesData | null> {
  const cached = _ogCategoriesData.get(orthofinderVersion);
  if (cached) return cached;

  _ogCategoriesInflight.get(orthofinderVersion)?.abort();
  const controller = new AbortController();
  _ogCategoriesInflight.set(orthofinderVersion, controller);
  const combined = mergeSignals(signal, controller.signal);

  try {
    const path = `orthofinder/v${orthofinderVersion}/og_categories.json`;
    const data = await downloadJson<OgCategoriesData>(path, combined);
    _ogCategoriesData.set(orthofinderVersion, data);
    return data;
  } catch {
    return null; // missing file is fine — fallback to regex
  } finally {
    if (_ogCategoriesInflight.get(orthofinderVersion) === controller) {
      _ogCategoriesInflight.delete(orthofinderVersion);
    }
  }
}

export async function fetchOrthogroupDiffPayload(
  storagePath: string,
  signal?: AbortSignal,
): Promise<OrthogroupDiffPayload> {
  const cached = _diffPayloadData.get(storagePath);
  if (cached) return cached;

  _diffPayloadInflight.get(storagePath)?.abort();
  const controller = new AbortController();
  _diffPayloadInflight.set(storagePath, controller);
  const combined = mergeSignals(signal, controller.signal);

  try {
    const raw = await downloadJson<unknown>(storagePath, combined);
    if (!isDiffPayload(raw)) {
      throw new Error(`Invalid diff payload shape at ${storagePath}`);
    }
    _diffPayloadData.set(storagePath, raw);
    return raw;
  } finally {
    if (_diffPayloadInflight.get(storagePath) === controller) {
      _diffPayloadInflight.delete(storagePath);
    }
  }
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

function mergeSignals(a: AbortSignal | undefined, b: AbortSignal): AbortSignal {
  if (!a) return b;
  const ctrl = new AbortController();
  const forward = () => ctrl.abort();
  a.addEventListener('abort', forward);
  b.addEventListener('abort', forward);
  if (a.aborted || b.aborted) ctrl.abort();
  return ctrl.signal;
}

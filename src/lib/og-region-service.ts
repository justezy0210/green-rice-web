/**
 * Per-OG region artifacts: gene coordinates, tube map, allele frequency.
 * Split from orthogroup-service.ts to keep files under 300 lines.
 */

import { ref as storageRef, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import {
  ogAlleleFreqLegacyPath,
  ogAlleleFreqPath,
  ogGeneCoordsPath,
  ogRegionManifestPath,
  ogRegionPath,
  ogTubeMapPath,
} from '@/lib/storage-paths';
import type { TraitId } from '@/types/grouping';
import type {
  OgAlleleFreqPayload,
  OgGeneCoords,
  OgRegionManifest,
  OgTubeMapData,
  RegionData,
} from '@/types/orthogroup';

// ─────────────────────────────────────────────────────────────
// Shared download helper (duplicated intentionally — see also orthogroup-service.ts)
// ─────────────────────────────────────────────────────────────

class NotFoundError extends Error {
  constructor(path: string) {
    super(`Not found: ${path}`);
    this.name = 'NotFoundError';
  }
}

async function downloadJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const url = await getDownloadURL(storageRef(storage, path));
  const res = await fetch(url, { signal });
  if (res.status === 404) throw new NotFoundError(path);
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
  return (await res.json()) as T;
}

export function chunkKeyForOg(ogId: string): string {
  const m = ogId.match(/^OG(\d+)$/);
  if (!m) throw new Error(`Invalid orthogroup id: ${ogId}`);
  return Math.floor(parseInt(m[1], 10) / 1000).toString().padStart(3, '0');
}

// ─────────────────────────────────────────────────────────────
// Gene coordinates
// ─────────────────────────────────────────────────────────────

const _geneCoordsChunks = new Map<string, Record<string, OgGeneCoords>>();

export async function fetchOgGeneCoords(
  ogId: string,
  signal?: AbortSignal,
): Promise<OgGeneCoords | null> {
  const chunkKey = chunkKeyForOg(ogId);
  const cached = _geneCoordsChunks.get(chunkKey);
  if (cached) return cached[ogId] ?? null;
  try {
    const data = await downloadJson<Record<string, OgGeneCoords>>(
      ogGeneCoordsPath(chunkKey),
      signal,
    );
    _geneCoordsChunks.set(chunkKey, data);
    return data[ogId] ?? null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Tube map
// ─────────────────────────────────────────────────────────────

const _tubeMapData = new Map<string, OgTubeMapData>();

export async function fetchOgTubeMap(
  ogId: string,
  signal?: AbortSignal,
): Promise<OgTubeMapData | null> {
  const cached = _tubeMapData.get(ogId);
  if (cached) return cached;
  try {
    const data = await downloadJson<OgTubeMapData>(ogTubeMapPath(ogId), signal);
    _tubeMapData.set(ogId, data);
    return data;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Per-cluster region data (batch-region-extract.py artifact)
// ─────────────────────────────────────────────────────────────

const _regionData = new Map<string, RegionData>();
let _manifestData: OgRegionManifest | null = null;
let _manifestInflight: Promise<OgRegionManifest | null> | null = null;

export async function fetchOgRegion(
  ogId: string,
  clusterId: string,
  signal?: AbortSignal,
): Promise<RegionData | null> {
  const key = `${ogId}/${clusterId}`;
  const cached = _regionData.get(key);
  if (cached) return cached;
  try {
    const data = await downloadJson<RegionData>(
      ogRegionPath(ogId, clusterId),
      signal,
    );
    _regionData.set(key, data);
    return data;
  } catch {
    return null;
  }
}

export async function fetchOgRegionManifest(
  signal?: AbortSignal,
): Promise<OgRegionManifest | null> {
  if (_manifestData) return _manifestData;
  // Share an in-flight request across concurrent callers, but let its own
  // signal-free fetch finish even if a caller aborts — otherwise a
  // strict-mode double-mount poisons the cache with a null result.
  if (!_manifestInflight) {
    _manifestInflight = (async () => {
      try {
        const data = await downloadJson<OgRegionManifest>(ogRegionManifestPath());
        _manifestData = data;
        return data;
      } catch {
        return null;
      } finally {
        _manifestInflight = null;
      }
    })();
  }
  const result = await raceWithAbort(_manifestInflight, signal);
  return result;
}

function raceWithAbort<T>(p: Promise<T>, signal?: AbortSignal): Promise<T | null> {
  if (!signal) return p;
  if (signal.aborted) return Promise.resolve(null);
  return new Promise<T | null>((resolve) => {
    const onAbort = () => resolve(null);
    signal.addEventListener('abort', onAbort, { once: true });
    p.then((v) => {
      signal.removeEventListener('abort', onAbort);
      resolve(v);
    });
  });
}

// ─────────────────────────────────────────────────────────────
// Allele frequency (versioned)
// ─────────────────────────────────────────────────────────────

const _afData = new Map<string, OgAlleleFreqPayload>();

export async function fetchOgAlleleFreq(
  traitId: TraitId,
  orthofinderVersion: number,
  groupingVersion: number,
  signal?: AbortSignal,
): Promise<OgAlleleFreqPayload | null> {
  const path = ogAlleleFreqPath(orthofinderVersion, groupingVersion, traitId);
  const cached = _afData.get(path);
  if (cached) return cached;
  try {
    const data = await downloadJson<OgAlleleFreqPayload>(path, signal);
    _afData.set(path, data);
    return data;
  } catch {
    try {
      const legacyPath = ogAlleleFreqLegacyPath(traitId);
      const data = await downloadJson<OgAlleleFreqPayload>(legacyPath, signal);
      _afData.set(path, data);
      return data;
    } catch {
      return null;
    }
  }
}

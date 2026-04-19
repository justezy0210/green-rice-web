/**
 * Per-OG region artifacts: gene coordinates, tube map, allele frequency.
 * Split from orthogroup-service.ts to keep files under 300 lines.
 */

import { ref as storageRef, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
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
      `og_gene_coords/chunk_${chunkKey}.json`,
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
    const data = await downloadJson<OgTubeMapData>(`og_tubemap/${ogId}.json`, signal);
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
let _manifestPromise: Promise<OgRegionManifest | null> | null = null;

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
      `og_region/${ogId}/${clusterId}.json`,
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
  if (_manifestPromise) return _manifestPromise;
  _manifestPromise = (async () => {
    try {
      return await downloadJson<OgRegionManifest>('og_region/_manifest.json', signal);
    } catch {
      return null;
    }
  })();
  return _manifestPromise;
}

// ─────────────────────────────────────────────────────────────
// Allele frequency (versioned)
// ─────────────────────────────────────────────────────────────

const _afData = new Map<string, OgAlleleFreqPayload>();

export async function fetchOgAlleleFreq(
  traitId: string,
  orthofinderVersion: number,
  groupingVersion: number,
  signal?: AbortSignal,
): Promise<OgAlleleFreqPayload | null> {
  const path = `og_allele_freq/v${orthofinderVersion}/g${groupingVersion}/${traitId}.json`;
  const cached = _afData.get(path);
  if (cached) return cached;
  try {
    const data = await downloadJson<OgAlleleFreqPayload>(path, signal);
    _afData.set(path, data);
    return data;
  } catch {
    try {
      const legacyPath = `og_allele_freq/${traitId}.json`;
      const data = await downloadJson<OgAlleleFreqPayload>(legacyPath, signal);
      _afData.set(path, data);
      return data;
    } catch {
      return null;
    }
  }
}

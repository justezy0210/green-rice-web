import { FirebaseError } from 'firebase/app';
import { ref as storageRef, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import type {
  SvChrBundle,
  SvCultivarCoordBundle,
  SvManifest,
  SvTraitGroupFreqBundle,
} from '@/types/sv-event';
import type { TraitId } from '@/types/traits';

const manifestCache = new Map<string, SvManifest>();
const chrCache = new Map<string, SvChrBundle>();
const freqCache = new Map<string, SvTraitGroupFreqBundle>();
const cultivarCoordCache = new Map<string, SvCultivarCoordBundle>();

async function fetchJson<T>(path: string): Promise<T> {
  const url = await getDownloadURL(storageRef(storage, path));
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`sv storage fetch failed (${res.status}): ${path}`);
  }
  return (await res.json()) as T;
}

export async function fetchSvManifest(svReleaseId: string): Promise<SvManifest> {
  const cached = manifestCache.get(svReleaseId);
  if (cached) return cached;
  const body = await fetchJson<SvManifest>(`sv_matrix/${svReleaseId}/manifest.json`);
  manifestCache.set(svReleaseId, body);
  return body;
}

export async function fetchSvChr(
  svReleaseId: string,
  chr: string,
): Promise<SvChrBundle> {
  const key = `${svReleaseId}:${chr}`;
  const cached = chrCache.get(key);
  if (cached) return cached;
  const body = await fetchJson<SvChrBundle>(
    `sv_matrix/${svReleaseId}/events/by_chr/${chr}.json.gz`,
  );
  chrCache.set(key, body);
  return body;
}

/**
 * Per-cultivar sample-frame coordinate bundle for one chromosome.
 * Returns an empty bundle (count=0, entries=[]) if the side-table
 * has not been generated yet for this release/cultivar/chr — callers
 * should fall back to hiding cultivar-specific SV overlays rather
 * than rendering with reference-frame positions.
 */
export async function fetchSvCultivarCoords(
  svReleaseId: string,
  cultivar: string,
  chr: string,
): Promise<SvCultivarCoordBundle> {
  const key = `${svReleaseId}:${cultivar}:${chr}`;
  const cached = cultivarCoordCache.get(key);
  if (cached) return cached;
  try {
    const body = await fetchJson<SvCultivarCoordBundle>(
      `sv_matrix/${svReleaseId}/per_cultivar_coords/${cultivar}/by_chr/${chr}.json.gz`,
    );
    cultivarCoordCache.set(key, body);
    return body;
  } catch (err) {
    // "Side-table not generated yet" is a legitimate empty state —
    // silently return an empty bundle. Every other error (auth,
    // network, corrupt JSON, CORS, etc.) must propagate so the UI
    // can surface a visible error instead of hiding overlays.
    const isNotFound =
      err instanceof FirebaseError && err.code === 'storage/object-not-found';
    if (!isNotFound) {
      console.error('[fetchSvCultivarCoords] unexpected failure', {
        svReleaseId, cultivar, chr, err,
      });
      throw err;
    }
    const empty: SvCultivarCoordBundle = {
      schemaVersion: 1,
      svReleaseId,
      cultivar,
      chr,
      count: 0,
      entries: [],
    };
    cultivarCoordCache.set(key, empty);
    return empty;
  }
}

export async function fetchSvTraitGroupFreq(
  svReleaseId: string,
  traitId: TraitId,
): Promise<SvTraitGroupFreqBundle> {
  const key = `${svReleaseId}:${traitId}`;
  const cached = freqCache.get(key);
  if (cached) return cached;
  const body = await fetchJson<SvTraitGroupFreqBundle>(
    `sv_matrix/${svReleaseId}/group_freq/by_trait/${traitId}.json.gz`,
  );
  freqCache.set(key, body);
  return body;
}

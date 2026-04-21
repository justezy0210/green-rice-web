import { ref as storageRef, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import type {
  SvChrBundle,
  SvManifest,
  SvTraitGroupFreqBundle,
} from '@/types/sv-event';
import type { TraitId } from '@/types/traits';

const manifestCache = new Map<string, SvManifest>();
const chrCache = new Map<string, SvChrBundle>();
const freqCache = new Map<string, SvTraitGroupFreqBundle>();

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

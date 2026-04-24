import { ref as storageRef, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import type { ConservationTier } from '@/lib/og-conservation';

/**
 * One row in the OG index — a compact precomputed view of each
 * orthogroup covering everything the Orthogroup browse page needs
 * WITHOUT fetching per-OG members. Heavy fields (members, cluster
 * matrix) stay in the OG detail fetch path.
 */
export interface OgIndexRow {
  ogId: string;
  tier: ConservationTier;
  presentCount: number;
  irgspCopyCount: number;
  memberCount: number;
  /** Trait ids that passed the hit threshold for this OG, if any. */
  traits?: string[];
  /** Strongest p-value across `traits`. Only present when `traits` is. */
  bestTraitP?: number;
}

export interface OgIndexBundle {
  schemaVersion: number;
  orthofinderVersion: number;
  groupingVersion: number;
  samples: string[];
  panelTotalCount: number;
  count: number;
  ogs: OgIndexRow[];
}

const cache = new Map<number, OgIndexBundle>();
const inflight = new Map<number, Promise<OgIndexBundle>>();

export async function fetchOgIndex(
  orthofinderVersion: number,
): Promise<OgIndexBundle> {
  const cached = cache.get(orthofinderVersion);
  if (cached) return cached;
  const existing = inflight.get(orthofinderVersion);
  if (existing) return existing;
  const p = (async () => {
    const path = `orthofinder/v${orthofinderVersion}/_og_index.json.gz`;
    const url = await getDownloadURL(storageRef(storage, path));
    const res = await fetch(url);
    if (!res.ok) throw new Error(`og index fetch failed (${res.status}): ${path}`);
    const body = (await res.json()) as OgIndexBundle;
    cache.set(orthofinderVersion, body);
    return body;
  })().finally(() => {
    inflight.delete(orthofinderVersion);
  });
  inflight.set(orthofinderVersion, p);
  return p;
}

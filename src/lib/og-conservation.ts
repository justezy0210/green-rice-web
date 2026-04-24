import { ref as storageRef, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

/**
 * Conservation tier is a **panel-only** classification so it behaves
 * as a pure PAV descriptor. IRGSP presence is reported separately on
 * the summary (as a reference comparison) — mixing the reference
 * into the tier would conflate "is this gene variable across the
 * panel?" with "does the reference happen to have it?".
 */
export type ConservationTier =
  | 'universal'     // present in every panel cultivar
  | 'common'        // ≥70% of panel
  | 'rare'          // 2 ≤ present < 70% of panel   ← canonical PAV region
  | 'private'       // exactly 1 panel cultivar
  | 'absent';       // 0 panel cultivars (may still exist in IRGSP reference)

export interface ConservationSummary {
  panelPresentCount: number;
  panelTotalCount: number;
  irgspCopyCount: number;
  irgspPresent: boolean;
  tier: ConservationTier;
  isPavCandidate: boolean;
}

export interface OgConservationBundle {
  schemaVersion: number;
  orthofinderVersion: number;
  samples: string[];
  count: number;
  /** ogId → per-sample copy counts, aligned with `samples` order. */
  counts: Record<string, number[]>;
}

const bundleCache = new Map<number, OgConservationBundle>();
const inflight = new Map<number, Promise<OgConservationBundle>>();

/**
 * Fetches the per-OG per-cultivar copy-count bundle so Gene/OG
 * detail surfaces can render a conservation tier without fetching
 * 10 MB of full members. ~200 KB gzipped, one-time per session.
 */
export async function fetchOgConservation(
  orthofinderVersion: number,
): Promise<OgConservationBundle> {
  const cached = bundleCache.get(orthofinderVersion);
  if (cached) return cached;
  const existing = inflight.get(orthofinderVersion);
  if (existing) return existing;
  const p = (async () => {
    const path = `orthofinder/v${orthofinderVersion}/_conservation.json.gz`;
    const url = await getDownloadURL(storageRef(storage, path));
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`og conservation fetch failed (${res.status}): ${path}`);
    }
    const body = (await res.json()) as OgConservationBundle;
    bundleCache.set(orthofinderVersion, body);
    return body;
  })().finally(() => {
    inflight.delete(orthofinderVersion);
  });
  inflight.set(orthofinderVersion, p);
  return p;
}

/**
 * Derives tier + PAV flag from raw per-sample counts for one OG.
 * Panel total is taken from the bundle's `samples` list minus
 * `IRGSP-1.0`, so additional cultivars automatically bump the panel
 * size without code changes.
 */
export function classifyOg(
  counts: number[],
  samples: string[],
): ConservationSummary {
  const irgspIdx = samples.indexOf('IRGSP-1.0');
  const irgspCopyCount = irgspIdx >= 0 ? counts[irgspIdx] ?? 0 : 0;
  const irgspPresent = irgspCopyCount > 0;
  let panelPresentCount = 0;
  let panelTotalCount = 0;
  for (let i = 0; i < samples.length; i++) {
    if (i === irgspIdx) continue;
    panelTotalCount += 1;
    if ((counts[i] ?? 0) > 0) panelPresentCount += 1;
  }
  const ratio = panelTotalCount === 0 ? 0 : panelPresentCount / panelTotalCount;
  let tier: ConservationTier;
  if (panelPresentCount === 0) tier = 'absent';
  else if (panelPresentCount === panelTotalCount) tier = 'universal';
  else if (panelPresentCount === 1) tier = 'private';
  else if (ratio >= 0.7) tier = 'common';
  else tier = 'rare';
  // Within-panel PAV only — "absent" and "universal" are non-variant.
  const isPavCandidate =
    tier === 'common' || tier === 'rare' || tier === 'private';
  return {
    panelPresentCount,
    panelTotalCount,
    irgspCopyCount,
    irgspPresent,
    tier,
    isPavCandidate,
  };
}

export function tierLabel(t: ConservationTier): string {
  switch (t) {
    case 'universal': return 'universal';
    case 'common': return 'common';
    case 'rare': return 'rare PAV';
    case 'private': return 'private PAV';
    case 'absent': return 'panel-absent';
  }
}

export function tierTone(t: ConservationTier): string {
  switch (t) {
    case 'universal': return 'border-gray-300 bg-gray-100 text-gray-700';
    case 'common': return 'border-green-300 bg-green-50 text-green-800';
    case 'rare': return 'border-amber-300 bg-amber-50 text-amber-800';
    case 'private': return 'border-rose-300 bg-rose-50 text-rose-800';
    case 'absent': return 'border-slate-300 bg-slate-50 text-slate-700';
  }
}

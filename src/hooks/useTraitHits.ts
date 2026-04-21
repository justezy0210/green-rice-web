import { useEffect, useState } from 'react';
import { publicDownloadUrl } from '@/lib/download-urls';
import { traitHitsIndexPath } from '@/lib/storage-paths';
import { useOrthogroupDiff } from './useOrthogroupDiff';
import { DEFAULT_TRAIT_ID } from '@/config/traits';

export interface TraitHit {
  t: string;
  p: number;
  lfc?: number;
}

export interface TraitHitsIndex {
  schemaVersion: 1;
  orthofinderVersion: number;
  groupingVersion: number;
  threshold: number;
  builtAt: string;
  traits: string[];
  hitCount: number;
  hits: Record<string, TraitHit[]>;
}

const _cache = new Map<string, TraitHitsIndex>();
const _inflight = new Map<string, Promise<TraitHitsIndex | null>>();

async function fetchTraitHits(
  of: number,
  g: number,
): Promise<TraitHitsIndex | null> {
  const key = `v${of}_g${g}`;
  const cached = _cache.get(key);
  if (cached) return cached;
  let p = _inflight.get(key);
  if (!p) {
    p = (async () => {
      try {
        const res = await fetch(publicDownloadUrl(traitHitsIndexPath(of, g)));
        if (!res.ok) return null;
        const data = (await res.json()) as TraitHitsIndex;
        _cache.set(key, data);
        return data;
      } finally {
        _inflight.delete(key);
      }
    })();
    _inflight.set(key, p);
  }
  return p;
}

/** Compact OG → hit-traits index. 22 KB gzipped, loaded once per session. */
export function useTraitHits(): {
  index: TraitHitsIndex | null;
  loading: boolean;
  hitsForOg: (og: string | undefined | null) => TraitHit[];
} {
  const { doc } = useOrthogroupDiff(DEFAULT_TRAIT_ID);
  const of = doc?.orthofinderVersion ?? null;
  const g = doc?.groupingVersion ?? null;
  const key = of && g ? `v${of}_g${g}` : '';
  const [state, setState] = useState<{
    key: string;
    index: TraitHitsIndex | null;
  }>({ key: '', index: null });

  useEffect(() => {
    if (!key || !of || !g) return;
    let cancelled = false;
    fetchTraitHits(of, g).then((idx) => {
      if (!cancelled) setState({ key, index: idx });
    });
    return () => {
      cancelled = true;
    };
  }, [key, of, g]);

  const isCurrent = state.key === key;
  const index = isCurrent ? state.index : null;
  return {
    index,
    loading: Boolean(key) && !isCurrent,
    hitsForOg: (og) => (og && index?.hits[og]) || [],
  };
}

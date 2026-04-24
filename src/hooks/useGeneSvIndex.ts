import { useEffect, useState } from 'react';
import { fetchGeneSvIndex } from '@/lib/gene-sv-index-service';
import { SV_RELEASE_ID } from '@/lib/releases';
import { DEFAULT_TRAIT_ID } from '@/config/traits';
import { useOrthogroupDiff } from './useOrthogroupDiff';
import type { GeneSvEntry, GeneSvIndex } from '@/types/gene-sv-index';

interface Result {
  loading: boolean;
  available: boolean;
  lookup: (geneId: string | null | undefined) => GeneSvEntry | null;
}

const NO_ENTRY: (g: string | null | undefined) => GeneSvEntry | null = () => null;

/**
 * Gene → SV overlap evidence lookup for row-level badges. Loads the
 * precomputed `gene_sv_index` bundle once per `(orthofinder, svRelease)`
 * tuple and hands callers a synchronous lookup. Returns `available:
 * false` when the bundle has not been built for the active tuple — the
 * UI should then omit the badge rather than surface a broken state.
 */
export function useGeneSvIndex(): Result {
  const { doc } = useOrthogroupDiff(DEFAULT_TRAIT_ID);
  const version = doc?.orthofinderVersion ?? null;
  const key = version ? `v${version}_r${SV_RELEASE_ID}` : '';
  const [state, setState] = useState<{ key: string; index: GeneSvIndex | null }>(
    { key: '', index: null },
  );

  useEffect(() => {
    if (!key || !version) return;
    let cancelled = false;
    fetchGeneSvIndex(version, SV_RELEASE_ID).then((idx) => {
      if (!cancelled) setState({ key, index: idx });
    });
    return () => {
      cancelled = true;
    };
  }, [key, version]);

  const isCurrent = state.key === key;
  const index = isCurrent ? state.index : null;

  if (!index) {
    return {
      loading: Boolean(key) && !isCurrent,
      available: false,
      lookup: NO_ENTRY,
    };
  }
  return {
    loading: false,
    available: true,
    lookup: (geneId) => (geneId ? index.genes[geneId] ?? null : null),
  };
}

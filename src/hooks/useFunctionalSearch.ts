import { useEffect, useState } from 'react';
import { publicDownloadUrl } from '@/lib/download-urls';
import { functionalIndexPath } from '@/lib/storage-paths';
import {
  routeQuery,
  type FunctionalIndex,
  type FunctionalRow,
  type SearchMode,
} from '@/types/functional-index';
import { useOrthogroupDiff } from './useOrthogroupDiff';
import { DEFAULT_TRAIT_ID } from '@/config/traits';

const _cache = new Map<number, FunctionalIndex>();
const _inflight = new Map<number, Promise<FunctionalIndex | null>>();

function useActiveOrthofinderVersion(): number | null {
  const { doc } = useOrthogroupDiff(DEFAULT_TRAIT_ID);
  return doc?.orthofinderVersion ?? null;
}

async function fetchIndex(version: number): Promise<FunctionalIndex | null> {
  const cached = _cache.get(version);
  if (cached) return cached;
  let p = _inflight.get(version);
  if (!p) {
    p = (async () => {
      try {
        const res = await fetch(publicDownloadUrl(functionalIndexPath(version)));
        if (!res.ok) return null;
        const data = (await res.json()) as FunctionalIndex;
        _cache.set(version, data);
        return data;
      } finally {
        _inflight.delete(version);
      }
    })();
    _inflight.set(version, p);
  }
  return p;
}

interface FunctionalSearchHit {
  row: FunctionalRow;
  /** Which field matched (for UI display hint). */
  via: 'pfam' | 'interpro' | 'go' | 'product';
}

interface FunctionalSearchResult {
  mode: SearchMode;
  loading: boolean;
  indexAvailable: boolean;
  annotatedCultivars: string[];
  hits: FunctionalSearchHit[];
  truncated: boolean;
}

export function useFunctionalSearch(
  query: string,
  limit = 1000,
): FunctionalSearchResult {
  const version = useActiveOrthofinderVersion();
  const mode = routeQuery(query);
  const key = version ? `v${version}` : '';
  const [state, setState] = useState<{
    key: string;
    index: FunctionalIndex | null;
  }>({ key: '', index: null });

  useEffect(() => {
    if (!key || !version) return;
    let cancelled = false;
    fetchIndex(version).then((idx) => {
      if (!cancelled) setState({ key, index: idx });
    });
    return () => {
      cancelled = true;
    };
  }, [key, version]);

  const isCurrent = state.key === key;
  const index = isCurrent ? state.index : null;
  const indexAvailable = Boolean(index);
  const annotatedCultivars = index?.annotatedCultivars ?? [];

  const q = query.trim();
  const hits: FunctionalSearchHit[] = [];
  let truncated = false;
  if (index && mode !== 'idle' && mode !== 'gene-id') {
    const pushRows = (rowIds: number[], via: FunctionalSearchHit['via']) => {
      for (const id of rowIds) {
        const row = index.rows[id];
        if (!row) continue;
        hits.push({ row, via });
        if (hits.length >= limit) {
          truncated = true;
          return true;
        }
      }
      return false;
    };
    if (mode === 'pfam') {
      pushRows(index.idx.pf[q.toUpperCase()] ?? [], 'pfam');
    } else if (mode === 'interpro') {
      pushRows(index.idx.ip[q.toUpperCase()] ?? [], 'interpro');
    } else if (mode === 'go') {
      const key = q.toUpperCase().startsWith('GO:')
        ? q.slice(3)
        : q;
      pushRows(index.idx.go[key] ?? [], 'go');
    } else if (mode === 'product') {
      const needle = q.toLowerCase();
      for (let i = 0; i < index.rows.length; i++) {
        const r = index.rows[i];
        if (r.p && r.p.includes(needle)) {
          hits.push({ row: r, via: 'product' });
          if (hits.length >= limit) {
            truncated = true;
            break;
          }
        }
      }
    }
  }

  return {
    mode,
    loading: Boolean(key) && !isCurrent,
    indexAvailable,
    annotatedCultivars,
    hits,
    truncated,
  };
}

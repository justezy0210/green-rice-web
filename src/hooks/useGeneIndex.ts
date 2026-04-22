import { useEffect, useState } from 'react';
import { publicDownloadUrl } from '@/lib/download-urls';
import {
  geneIndexManifestPath,
  geneIndexPartitionPath,
} from '@/lib/storage-paths';
import {
  prefixForGeneId,
  type GeneIndexEntry,
  type GeneIndexManifest,
  type GeneIndexPartition,
} from '@/types/gene-index';
import { useOrthogroupDiff } from './useOrthogroupDiff';
import { DEFAULT_TRAIT_ID } from '@/config/traits';

/**
 * Active OrthoFinder version for the gene index lookup. Sourced from the
 * default trait's diff doc since the og_region v2 pointer may not be
 * promoted yet. Trait is arbitrary — only the version field is used.
 */
function useActiveOrthofinderVersion(): number | null {
  const { doc } = useOrthogroupDiff(DEFAULT_TRAIT_ID);
  return doc?.orthofinderVersion ?? null;
}

const _manifestCache = new Map<number, GeneIndexManifest>();
const _manifestInflight = new Map<number, Promise<GeneIndexManifest | null>>();
const _partitionCache = new Map<string, GeneIndexPartition>();
const _partitionInflight = new Map<string, Promise<GeneIndexPartition | null>>();

async function fetchManifest(version: number): Promise<GeneIndexManifest | null> {
  const cached = _manifestCache.get(version);
  if (cached) return cached;
  let p = _manifestInflight.get(version);
  if (!p) {
    p = (async () => {
      try {
        const res = await fetch(publicDownloadUrl(geneIndexManifestPath(version)));
        if (!res.ok) return null;
        const data = (await res.json()) as GeneIndexManifest;
        _manifestCache.set(version, data);
        return data;
      } finally {
        _manifestInflight.delete(version);
      }
    })();
    _manifestInflight.set(version, p);
  }
  return p;
}

async function fetchPartition(
  version: number,
  prefix: string,
): Promise<GeneIndexPartition | null> {
  const key = `v${version}|${prefix}`;
  const cached = _partitionCache.get(key);
  if (cached) return cached;
  let p = _partitionInflight.get(key);
  if (!p) {
    p = (async () => {
      try {
        const res = await fetch(
          publicDownloadUrl(geneIndexPartitionPath(version, prefix)),
        );
        if (!res.ok) return null;
        const data = (await res.json()) as GeneIndexPartition;
        _partitionCache.set(key, data);
        return data;
      } finally {
        _partitionInflight.delete(key);
      }
    })();
    _partitionInflight.set(key, p);
  }
  return p;
}

/**
 * Manifest summary only — lightweight. Used by Genes landing to show
 * the index size / build timestamp and to decide whether to disable
 * search when the index has not been built yet.
 */
export function useGeneIndexManifest(): {
  manifest: GeneIndexManifest | null;
  loading: boolean;
  version: number | null;
} {
  const version = useActiveOrthofinderVersion();
  const [state, setState] = useState<{ key: string; manifest: GeneIndexManifest | null }>({
    key: '',
    manifest: null,
  });

  const key = version ? `v${version}` : '';

  useEffect(() => {
    if (!key || !version) return;
    let cancelled = false;
    fetchManifest(version).then((m) => {
      if (!cancelled) setState({ key, manifest: m });
    });
    return () => {
      cancelled = true;
    };
  }, [key, version]);

  const isCurrent = state.key === key;
  return {
    manifest: isCurrent ? state.manifest : null,
    loading: Boolean(key) && !isCurrent,
    version,
  };
}

/**
 * Resolve a single gene id → { og, cultivar }. Loads the right
 * partition on first call.
 */
export function useGeneLookup(geneId: string | null): {
  entry: GeneIndexEntry | null;
  loading: boolean;
  notFound: boolean;
  version: number | null;
} {
  const version = useActiveOrthofinderVersion();
  const [state, setState] = useState<{
    key: string;
    entry: GeneIndexEntry | null;
    notFound: boolean;
  }>({ key: '', entry: null, notFound: false });

  const key = geneId && version ? `v${version}|${geneId}` : '';

  useEffect(() => {
    if (!key || !version || !geneId) return;
    let cancelled = false;
    (async () => {
      const prefix = prefixForGeneId(geneId);
      const partition = await fetchPartition(version, prefix);
      if (cancelled) return;
      let entry: GeneIndexEntry | null = partition?.entries[geneId] ?? null;
      // gene_index keys are transcript-level ("baegilmi_g1.t1").
      // If the URL carries a bare gene id (from functional search), fall back
      // to the first matching "${geneId}.tN" transcript.
      if (!entry && partition && !/\.t\d+$/.test(geneId)) {
        const prefixStr = `${geneId}.t`;
        for (const k of Object.keys(partition.entries)) {
          if (k.startsWith(prefixStr)) {
            entry = partition.entries[k];
            break;
          }
        }
      }
      setState({ key, entry, notFound: partition !== null && entry === null });
    })();
    return () => {
      cancelled = true;
    };
  }, [key, version, geneId]);

  const isCurrent = state.key === key;
  return {
    entry: isCurrent ? state.entry : null,
    loading: Boolean(key) && !isCurrent,
    notFound: isCurrent && state.notFound,
    version,
  };
}

/**
 * Iterate every gene→OG entry in a single prefix partition. Used by
 * the Region page to annotate the Overlapping-genes rows with their
 * OG id without issuing per-gene lookups.
 */
export function useGeneIndexPartition(prefix: string | null): {
  partition: GeneIndexPartition | null;
  loading: boolean;
} {
  const version = useActiveOrthofinderVersion();
  const key = prefix && version ? `v${version}|${prefix}` : '';
  const [state, setState] = useState<{
    key: string;
    partition: GeneIndexPartition | null;
  }>({ key: '', partition: null });

  useEffect(() => {
    if (!key || !version || !prefix) return;
    let cancelled = false;
    fetchPartition(version, prefix).then((p) => {
      if (!cancelled) setState({ key, partition: p });
    });
    return () => {
      cancelled = true;
    };
  }, [key, version, prefix]);

  const isCurrent = state.key === key;
  return {
    partition: isCurrent ? state.partition : null,
    loading: Boolean(key) && !isCurrent,
  };
}

/**
 * Live partial-match search.
 *   - 1 char: fetches every partition whose prefix starts with that char
 *   - 2+ chars: fetches just the exact 2-char prefix partition
 * Results are substring-matched against the query, case-insensitive.
 * `limit` is a safety cap (default 1000) — the UI is expected to paginate
 * further if needed.
 */
export function useGeneSearch(
  query: string,
  limit = 1000,
): {
  results: { geneId: string; entry: GeneIndexEntry }[];
  loading: boolean;
  prefixes: string[];
  totalSearched: number;
  version: number | null;
} {
  const version = useActiveOrthofinderVersion();
  const { manifest } = useGeneIndexManifest();

  const trimmed = query.trim();
  const prefixes: string[] = [];
  if (manifest && trimmed.length >= 1) {
    const ch0 = trimmed[0].toUpperCase();
    if (trimmed.length >= 2) {
      const full = prefixForGeneId(trimmed);
      if (manifest.partitions[full]) prefixes.push(full);
    } else {
      for (const pfx of Object.keys(manifest.partitions)) {
        if (pfx.startsWith(ch0)) prefixes.push(pfx);
      }
    }
  }

  const key = prefixes.length && version
    ? `v${version}|${prefixes.join(',')}`
    : '';

  const [state, setState] = useState<{
    key: string;
    partitions: GeneIndexPartition[];
  }>({ key: '', partitions: [] });

  useEffect(() => {
    if (!key || !version || prefixes.length === 0) return;
    let cancelled = false;
    Promise.all(prefixes.map((p) => fetchPartition(version, p))).then((parts) => {
      if (cancelled) return;
      const resolved = parts.filter((p): p is GeneIndexPartition => p !== null);
      setState({ key, partitions: resolved });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, version]);

  const isCurrent = state.key === key;
  const partitions = isCurrent ? state.partitions : [];

  const results: { geneId: string; entry: GeneIndexEntry }[] = [];
  let totalSearched = 0;
  if (partitions.length > 0 && trimmed.length >= 1) {
    const q = trimmed.toUpperCase();
    outer: for (const partition of partitions) {
      totalSearched += Object.keys(partition.entries).length;
      for (const [geneId, entry] of Object.entries(partition.entries)) {
        if (geneId.toUpperCase().includes(q)) {
          results.push({ geneId, entry });
          if (results.length >= limit) break outer;
        }
      }
    }
  }

  return {
    results,
    loading: Boolean(key) && !isCurrent,
    prefixes,
    totalSearched,
    version,
  };
}

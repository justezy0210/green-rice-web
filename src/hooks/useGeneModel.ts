import { useEffect, useState } from 'react';
import { publicDownloadUrl } from '@/lib/download-urls';
import {
  geneModelsManifestPath,
  geneModelsPartitionPath,
} from '@/lib/storage-paths';
import { prefixForGeneId } from '@/types/gene-index';
import type {
  GeneModelEntry,
  GeneModelManifest,
  GeneModelPartition,
} from '@/types/gene-model';
import { useOrthogroupDiff } from './useOrthogroupDiff';
import { DEFAULT_TRAIT_ID } from '@/config/traits';

/** `baegilmi_g42643.t1` → `baegilmi_g42643`. funannotate / OrthoFinder convention. */
function stripTranscriptSuffix(id: string): string {
  const m = id.match(/^(.+)\.t\d+$/);
  return m ? m[1] : id;
}

const _manifestCache = new Map<number, GeneModelManifest>();
const _manifestInflight = new Map<number, Promise<GeneModelManifest | null>>();
const _partitionCache = new Map<string, GeneModelPartition>();
const _partitionInflight = new Map<string, Promise<GeneModelPartition | null>>();

function useActiveOrthofinderVersion(): number | null {
  const { doc } = useOrthogroupDiff(DEFAULT_TRAIT_ID);
  return doc?.orthofinderVersion ?? null;
}

async function fetchManifest(version: number): Promise<GeneModelManifest | null> {
  const cached = _manifestCache.get(version);
  if (cached) return cached;
  let p = _manifestInflight.get(version);
  if (!p) {
    p = (async () => {
      try {
        const res = await fetch(publicDownloadUrl(geneModelsManifestPath(version)));
        if (!res.ok) return null;
        const data = (await res.json()) as GeneModelManifest;
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
): Promise<GeneModelPartition | null> {
  const key = `v${version}|${prefix}`;
  const cached = _partitionCache.get(key);
  if (cached) return cached;
  let p = _partitionInflight.get(key);
  if (!p) {
    p = (async () => {
      try {
        const res = await fetch(
          publicDownloadUrl(geneModelsPartitionPath(version, prefix)),
        );
        if (!res.ok) return null;
        const data = (await res.json()) as GeneModelPartition;
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
 * Look up a single gene's model (exon structure + functional annotation).
 * Lazy-loads the relevant partition (~20–40 MB) on first call; cached
 * module-scope for subsequent lookups.
 */
export function useGeneModel(geneId: string | null): {
  entry: GeneModelEntry | null;
  loading: boolean;
  notFound: boolean;
} {
  const version = useActiveOrthofinderVersion();
  const key = geneId && version ? `v${version}|${geneId}` : '';
  const [state, setState] = useState<{
    key: string;
    entry: GeneModelEntry | null;
    notFound: boolean;
  }>({ key: '', entry: null, notFound: false });

  useEffect(() => {
    if (!key || !version || !geneId) return;
    let cancelled = false;
    (async () => {
      const prefix = prefixForGeneId(geneId);
      const partition = await fetchPartition(version, prefix);
      if (cancelled) return;
      // gene_index keys are transcript-level (e.g. "baegilmi_g1.t1") while
      // gene_models keys are gene-level ("baegilmi_g1"). Try the id as-is
      // first, then fall back to the ".tN"-stripped form.
      const entry =
        partition?.genes[geneId] ??
        partition?.genes[stripTranscriptSuffix(geneId)] ??
        null;
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
  };
}

/**
 * Iterate every gene in a single partition. Useful for coordinate-
 * based queries (Region page) where we want all genes of one cultivar
 * on one chromosome, not a single gene by id. Returns null while the
 * partition is still loading.
 */
export function useGeneModelsPartition(prefix: string | null): {
  partition: GeneModelPartition | null;
  loading: boolean;
} {
  const version = useActiveOrthofinderVersion();
  const key = prefix && version ? `v${version}|${prefix}` : '';
  const [state, setState] = useState<{
    key: string;
    partition: GeneModelPartition | null;
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

export function useGeneModelsManifest(): {
  manifest: GeneModelManifest | null;
  loading: boolean;
} {
  const version = useActiveOrthofinderVersion();
  const key = version ? `v${version}` : '';
  const [state, setState] = useState<{
    key: string;
    manifest: GeneModelManifest | null;
  }>({ key: '', manifest: null });

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
  };
}

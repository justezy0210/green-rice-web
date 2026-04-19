import { useEffect, useState } from 'react';
import { publicDownloadUrl } from '@/lib/download-urls';
import { ogRegionPointerPath } from '@/lib/storage-paths';
import type {
  AfManifest,
  GraphManifest,
  OgRegionPointer,
} from '@/types/og-region-v2';

/**
 * Two-stage loader for the og_region v2 pointer + graph manifest + the
 * per-trait AF manifest (fetched on demand).
 *
 * Module-scope cache + in-flight dedupe — pointer + graph manifest are
 * small (tens of KB) and change only when a new `(of, g)` is promoted.
 * Legacy v1 dual-read fallback is intentionally OUT of scope of this
 * hook; a separate legacy hook handles clusters that still live under
 * the old path. Release B removes that.
 */

type PointerState = {
  pointer: OgRegionPointer | null;
  graph: GraphManifest | null;
  error: string | null;
};

let cachedPointer: OgRegionPointer | null = null;
let cachedGraph: GraphManifest | null = null;
let pointerInflight: Promise<PointerState> | null = null;

async function loadPointerAndGraph(): Promise<PointerState> {
  if (cachedPointer && cachedGraph) {
    return { pointer: cachedPointer, graph: cachedGraph, error: null };
  }
  if (!pointerInflight) {
    pointerInflight = (async () => {
      try {
        const pRes = await fetch(publicDownloadUrl(ogRegionPointerPath()), {
          cache: 'no-store',
        });
        if (!pRes.ok) throw new Error(`pointer ${pRes.status}`);
        const pointer = (await pRes.json()) as OgRegionPointer;
        const gRes = await fetch(publicDownloadUrl(pointer.graphManifest));
        if (!gRes.ok) throw new Error(`graph manifest ${gRes.status}`);
        const graph = (await gRes.json()) as GraphManifest;
        cachedPointer = pointer;
        cachedGraph = graph;
        return { pointer, graph, error: null };
      } catch (err) {
        return {
          pointer: null, graph: null,
          error: err instanceof Error ? err.message : 'pointer unavailable',
        };
      } finally {
        pointerInflight = null;
      }
    })();
  }
  return pointerInflight;
}

if (typeof window !== 'undefined') {
  void loadPointerAndGraph();
}

export function useOgRegionPointer(): {
  pointer: OgRegionPointer | null;
  graph: GraphManifest | null;
  loading: boolean;
  error: string | null;
} {
  const [state, setState] = useState<PointerState & { resolved: boolean }>(() =>
    cachedPointer && cachedGraph
      ? { pointer: cachedPointer, graph: cachedGraph, error: null, resolved: true }
      : { pointer: null, graph: null, error: null, resolved: false },
  );

  useEffect(() => {
    if (state.resolved) return;
    let cancelled = false;
    loadPointerAndGraph().then((r) => {
      if (!cancelled) setState({ ...r, resolved: true });
    });
    return () => { cancelled = true; };
  }, [state.resolved]);

  return {
    pointer: state.pointer,
    graph: state.graph,
    loading: !state.resolved,
    error: state.error,
  };
}

// ── Per-trait AF manifest: cached by trait, fetched on demand ──

const afCache: Map<string, AfManifest> = new Map();
const afInflight: Map<string, Promise<AfManifest | null>> = new Map();

async function loadAfManifest(path: string): Promise<AfManifest | null> {
  const cached = afCache.get(path);
  if (cached) return cached;
  let p = afInflight.get(path);
  if (!p) {
    p = (async () => {
      try {
        const res = await fetch(publicDownloadUrl(path));
        if (!res.ok) return null;
        const data = (await res.json()) as AfManifest;
        afCache.set(path, data);
        return data;
      } finally {
        afInflight.delete(path);
      }
    })();
    afInflight.set(path, p);
  }
  return p;
}

export function useOgRegionAfManifest(traitId: string | null): {
  manifest: AfManifest | null;
  loading: boolean;
} {
  const { pointer } = useOgRegionPointer();
  const manifestPath = traitId ? pointer?.afManifests[traitId] ?? null : null;
  const [state, setState] = useState<{ key: string; data: AfManifest | null }>(() => {
    if (manifestPath && afCache.has(manifestPath)) {
      return { key: manifestPath, data: afCache.get(manifestPath) ?? null };
    }
    return { key: '', data: null };
  });

  useEffect(() => {
    if (!manifestPath) return;
    let cancelled = false;
    loadAfManifest(manifestPath).then((m) => {
      if (!cancelled) setState({ key: manifestPath, data: m });
    });
    return () => { cancelled = true; };
  }, [manifestPath]);

  const isCurrent = state.key === manifestPath;
  return {
    manifest: isCurrent ? state.data : null,
    loading: Boolean(manifestPath) && !isCurrent,
  };
}

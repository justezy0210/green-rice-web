import { useEffect, useMemo, useState } from 'react';
import { ref as storageRef, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import type { IntersectionRow } from '@/types/intersection';
import type { RunId } from '@/types/analysis-run';

interface Bundle {
  schemaVersion: number;
  runId: RunId;
  traitId: string;
  intersectionReleaseId: string;
  rows: IntersectionRow[];
}

interface State {
  rows: IntersectionRow[];
  loading: boolean;
  error: Error | null;
}

const _cache = new Map<RunId, IntersectionRow[]>();
const _inflight = new Map<RunId, Promise<IntersectionRow[]>>();

async function fetchBundle(runId: RunId): Promise<IntersectionRow[]> {
  const cached = _cache.get(runId);
  if (cached) return cached;
  const existing = _inflight.get(runId);
  if (existing) return existing;
  const p = (async () => {
    const url = await getDownloadURL(
      storageRef(storage, `analysis_runs/${runId}/step4_intersections.json.gz`),
    );
    const res = await fetch(url);
    if (!res.ok) throw new Error(`step4 bundle fetch failed (${res.status})`);
    const body = (await res.json()) as Bundle;
    const rows = body.rows ?? [];
    _cache.set(runId, rows);
    return rows;
  })();
  _inflight.set(runId, p);
  try {
    return await p;
  } finally {
    _inflight.delete(runId);
  }
}

/**
 * Full intersection list for a run, fetched from Storage once. Consumers
 * (block export, future Step 4 filters) slice it client-side; the
 * bundle is small enough (tens of thousands of rows gzipped) that
 * memoising it at module scope is fine.
 *
 * Optional `filter` narrows the returned rows on the client — useful
 * for block-scoped views. The filter is applied on top of the same
 * cached bundle, so multiple consumers share the fetch.
 */
export function useRunIntersections(
  runId: RunId | null | undefined,
  filter?: (row: IntersectionRow) => boolean,
): State {
  const [state, setState] = useState<{
    rows: IntersectionRow[];
    error: Error | null;
    key: string;
  } | null>(null);

  useEffect(() => {
    if (!runId) return;
    let cancelled = false;
    fetchBundle(runId)
      .then((rows) => {
        if (cancelled) return;
        setState({ rows, error: null, key: runId });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          rows: [],
          error: err instanceof Error ? err : new Error(String(err)),
          key: runId,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [runId]);

  const rows = useMemo(() => {
    if (!state || state.key !== runId) return [];
    if (!filter) return state.rows;
    return state.rows.filter(filter);
  }, [state, runId, filter]);

  if (!runId) return { rows: [], loading: false, error: null };
  if (!state || state.key !== runId) return { rows: [], loading: true, error: null };
  return { rows, loading: false, error: state.error };
}

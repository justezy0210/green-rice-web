import { useEffect, useState } from 'react';
import { publicDownloadUrl } from '@/lib/download-urls';
import { ogRegionGraphPath } from '@/lib/storage-paths';
import { useOgRegionPointer } from './useOgRegionPointer';
import type { RegionDataGraph } from '@/types/og-region-v2';

type State = { key: string; data: RegionDataGraph | null };
const EMPTY: State = { key: '', data: null };

/** Per-cluster trait-neutral graph bundle. */
export function useOgRegionGraph(
  ogId: string | null,
  clusterId: string | null,
): { data: RegionDataGraph | null; loading: boolean } {
  const { pointer } = useOgRegionPointer();
  const of = pointer?.activeOrthofinderVersion;
  const g = pointer?.activeGroupingVersion;
  const key = ogId && clusterId && of && g
    ? ogRegionGraphPath(of, g, ogId, clusterId)
    : '';
  const [state, setState] = useState<State>(EMPTY);

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    fetch(publicDownloadUrl(key), { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return (await res.json()) as RegionDataGraph;
      })
      .then((data) => {
        if (!controller.signal.aborted) setState({ key, data });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ key, data: null });
      });
    return () => controller.abort();
  }, [key]);

  const isCurrent = state.key === key;
  return {
    data: isCurrent ? state.data : null,
    loading: Boolean(key) && !isCurrent,
  };
}

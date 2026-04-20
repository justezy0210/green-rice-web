import { useEffect, useState } from 'react';
import { publicDownloadUrl } from '@/lib/download-urls';
import { ogRegionGraphPath } from '@/lib/storage-paths';
import { resolveRegionFetch, type RegionResolvedStatus } from '@/lib/region-fetch';
import { useOgRegionPointer } from './useOgRegionPointer';
import type { RegionDataGraph, RegionFetchStatus } from '@/types/og-region-v2';

type State = {
  key: string;
  data: RegionDataGraph | null;
  status: RegionResolvedStatus;
};
const EMPTY: State = { key: '', data: null, status: 'ok' };

/**
 * Per-cluster trait-neutral graph bundle. See useOgRegionAf for the
 * full state transition contract.
 */
export function useOgRegionGraph(
  ogId: string | null,
  clusterId: string | null,
): { data: RegionDataGraph | null; status: RegionFetchStatus; loading: boolean } {
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
    resolveRegionFetch<RegionDataGraph>(
      fetch(publicDownloadUrl(key), { signal: controller.signal }),
    ).then((result) => {
      if (controller.signal.aborted) return;
      setState({ key, ...result });
    });
    return () => controller.abort();
  }, [key]);

  if (!key) {
    return { data: null, status: 'idle', loading: false };
  }
  const isCurrent = state.key === key;
  if (!isCurrent) {
    return { data: null, status: 'loading', loading: true };
  }
  return {
    data: state.data,
    status: state.status,
    loading: false,
  };
}

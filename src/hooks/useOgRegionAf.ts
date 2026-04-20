import { useEffect, useState } from 'react';
import { publicDownloadUrl } from '@/lib/download-urls';
import { ogRegionAfPath } from '@/lib/storage-paths';
import { resolveRegionFetch, type RegionResolvedStatus } from '@/lib/region-fetch';
import { useOgRegionPointer } from './useOgRegionPointer';
import type { RegionDataAf, RegionFetchStatus } from '@/types/og-region-v2';

type State = {
  key: string;
  data: RegionDataAf | null;
  status: RegionResolvedStatus;
};
const EMPTY: State = { key: '', data: null, status: 'ok' };

/**
 * Per-(cluster, trait) AF bundle.
 *
 * State transitions (plan 2026-04-20-og-region-release-observability):
 *   no key                                → idle
 *   key present, no settled state yet     → loading
 *   HTTP 200 + parse ok                   → ok
 *   HTTP 404                              → missing
 *   HTTP 5xx / 403 / network / parse fail → unavailable
 *   abort                                 → no state write (next effect overwrites)
 */
export function useOgRegionAf(
  ogId: string | null,
  clusterId: string | null,
  traitId: string | null,
): { data: RegionDataAf | null; status: RegionFetchStatus; loading: boolean } {
  const { pointer } = useOgRegionPointer();
  const of = pointer?.activeOrthofinderVersion;
  const g = pointer?.activeGroupingVersion;
  const key = ogId && clusterId && traitId && of && g
    ? ogRegionAfPath(of, g, traitId, ogId, clusterId)
    : '';
  const [state, setState] = useState<State>(EMPTY);

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    resolveRegionFetch<RegionDataAf>(
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

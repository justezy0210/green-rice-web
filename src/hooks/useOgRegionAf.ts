import { useEffect, useState } from 'react';
import { publicDownloadUrl } from '@/lib/download-urls';
import { ogRegionAfPath } from '@/lib/storage-paths';
import { useOgRegionPointer } from './useOgRegionPointer';
import type { RegionDataAf } from '@/types/og-region-v2';

type State = { key: string; data: RegionDataAf | null };
const EMPTY: State = { key: '', data: null };

/** Per-(cluster, trait) AF bundle. */
export function useOgRegionAf(
  ogId: string | null,
  clusterId: string | null,
  traitId: string | null,
): { data: RegionDataAf | null; loading: boolean } {
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
    fetch(publicDownloadUrl(key), { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return (await res.json()) as RegionDataAf;
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

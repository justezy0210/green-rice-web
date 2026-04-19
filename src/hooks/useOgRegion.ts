import { useEffect, useState } from 'react';
import { fetchOgRegion, fetchOgRegionManifest } from '@/lib/og-region-service';
import type { OgRegionManifest, RegionData } from '@/types/orthogroup';

type RegionState = { key: string; data: RegionData | null };
const EMPTY_REGION: RegionState = { key: '', data: null };

export function useOgRegion(
  ogId: string | null,
  clusterId: string | null,
): { data: RegionData | null; loading: boolean } {
  const key = ogId && clusterId ? `${ogId}/${clusterId}` : '';
  const [state, setState] = useState<RegionState>(EMPTY_REGION);

  useEffect(() => {
    if (!ogId || !clusterId) return;
    const controller = new AbortController();
    fetchOgRegion(ogId, clusterId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setState({ key, data: result });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ key, data: null });
      });
    return () => controller.abort();
  }, [ogId, clusterId, key]);

  const isCurrent = state.key === key;
  return {
    data: isCurrent ? state.data : null,
    loading: Boolean(key) && !isCurrent,
  };
}

type ManifestState = 'idle' | 'loaded';

export function useOgRegionManifest(): {
  manifest: OgRegionManifest | null;
  loading: boolean;
} {
  const [manifest, setManifest] = useState<OgRegionManifest | null>(null);
  const [status, setStatus] = useState<ManifestState>('idle');

  useEffect(() => {
    const controller = new AbortController();
    fetchOgRegionManifest(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setManifest(result);
          setStatus('loaded');
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus('loaded');
      });
    return () => controller.abort();
  }, []);

  return { manifest, loading: status === 'idle' };
}

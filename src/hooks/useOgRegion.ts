import { useEffect, useState } from 'react';
import { fetchOgRegion, fetchOgRegionManifest } from '@/lib/og-region-service';
import type { OgRegionManifest, RegionData } from '@/types/orthogroup';

export function useOgRegion(
  ogId: string | null,
  clusterId: string | null,
): { data: RegionData | null; loading: boolean } {
  const [data, setData] = useState<RegionData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ogId || !clusterId) {
      setData(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetchOgRegion(ogId, clusterId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [ogId, clusterId]);

  return { data, loading };
}

export function useOgRegionManifest(): {
  manifest: OgRegionManifest | null;
  loading: boolean;
} {
  const [manifest, setManifest] = useState<OgRegionManifest | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetchOgRegionManifest(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setManifest(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  return { manifest, loading };
}

import { useEffect, useState } from 'react';
import { fetchOgTubeMap } from '@/lib/orthogroup-service';
import type { OgTubeMapData } from '@/types/orthogroup';

export function useOgTubeMap(ogId: string | null): {
  data: OgTubeMapData | null;
  loading: boolean;
} {
  const [data, setData] = useState<OgTubeMapData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ogId) {
      setData(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetchOgTubeMap(ogId, controller.signal)
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
  }, [ogId]);

  return { data, loading };
}

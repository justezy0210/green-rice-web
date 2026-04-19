import { useEffect, useState } from 'react';
import { fetchOgGeneCoords } from '@/lib/orthogroup-service';
import type { OgGeneCoords } from '@/types/orthogroup';

export function useOgGeneCoords(ogId: string | null): {
  data: OgGeneCoords | null;
  loading: boolean;
} {
  const [data, setData] = useState<OgGeneCoords | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ogId) {
      setData(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetchOgGeneCoords(ogId, controller.signal)
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

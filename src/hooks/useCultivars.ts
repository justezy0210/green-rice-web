import { useState, useEffect, useCallback } from 'react';
import { getAllCultivars } from '@/lib/cultivar-service';
import type { CultivarDoc } from '@/types/cultivar';

export function useCultivars() {
  const [cultivars, setCultivars] = useState<(CultivarDoc & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllCultivars();
      setCultivars(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cultivars');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { cultivars, loading, error, refresh: fetch };
}

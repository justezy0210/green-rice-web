import { useState, useEffect, useCallback } from 'react';
import { dataService } from '@/lib/data-service';
import type { PhenotypeRecord, PhenotypeDatasetSummary } from '@/types/phenotype';
import type { LoadingState } from '@/types/common';

interface UsePhenotypeDataResult {
  records: PhenotypeRecord[];
  summary: PhenotypeDatasetSummary | null;
  loading: LoadingState;
  error: string | null;
  refresh: () => Promise<void>;
}

export function usePhenotypeData(): UsePhenotypeDataResult {
  const [records, setRecords] = useState<PhenotypeRecord[]>([]);
  const [summary, setSummary] = useState<PhenotypeDatasetSummary | null>(null);
  const [loading, setLoading] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading('loading');
    setError(null);
    try {
      const recs = await dataService.getPhenotypeRecords();
      setRecords(recs);
      const sum = await dataService.getDatasetSummary();
      setSummary(sum);
      setLoading('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setLoading('error');
    }
  }, []);

  const refresh = useCallback(async () => {
    dataService.invalidateCache();
    await load();
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  return { records, summary, loading, error, refresh };
}

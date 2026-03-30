import { useState, useEffect } from 'react';
import { dataService } from '@/lib/data-service';
import type { PhenotypeRecord, PhenotypeDatasetSummary } from '@/types/phenotype';
import type { LoadingState } from '@/types/common';

interface UsePhenotypeDataResult {
  records: PhenotypeRecord[];
  summary: PhenotypeDatasetSummary | null;
  loading: LoadingState;
  error: string | null;
}

export function usePhenotypeData(): UsePhenotypeDataResult {
  const [records, setRecords] = useState<PhenotypeRecord[]>([]);
  const [summary, setSummary] = useState<PhenotypeDatasetSummary | null>(null);
  const [loading, setLoading] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading('loading');
    dataService
      .getPhenotypeRecords()
      .then(async (recs) => {
        setRecords(recs);
        const sum = await dataService.getDatasetSummary();
        setSummary(sum);
        setLoading('success');
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading('error');
      });
  }, []);

  return { records, summary, loading, error };
}

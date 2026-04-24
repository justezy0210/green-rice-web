import { useState, useEffect, useCallback } from 'react';
import { dataService } from '@/lib/data-service';
import type { PhenotypeRecord, PhenotypeDatasetSummary } from '@/types/phenotype';

type LoadingState = 'loading' | 'success' | 'error';

interface UsePhenotypeDataResult {
  records: PhenotypeRecord[];
  summary: PhenotypeDatasetSummary | null;
  loading: LoadingState;
  error: string | null;
  refresh: () => Promise<void>;
}

type State = {
  records: PhenotypeRecord[];
  summary: PhenotypeDatasetSummary | null;
  loading: LoadingState;
  error: string | null;
};

const INITIAL_STATE: State = {
  records: [],
  summary: null,
  loading: 'loading',
  error: null,
};

export function usePhenotypeData(): UsePhenotypeDataResult {
  const [state, setState] = useState<State>(INITIAL_STATE);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const recs = await dataService.getPhenotypeRecords();
        if (cancelled) return;
        const sum = await dataService.getDatasetSummary();
        if (cancelled) return;
        setState({ records: recs, summary: sum, loading: 'success', error: null });
      } catch (err) {
        if (cancelled) return;
        setState({
          records: [],
          summary: null,
          loading: 'error',
          error: err instanceof Error ? err.message : 'Failed to load data',
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  const refresh = useCallback(async () => {
    dataService.invalidateCache();
    setState((prev) => ({ ...prev, loading: 'loading', error: null }));
    setRefreshToken((t) => t + 1);
  }, []);

  return { ...state, refresh };
}

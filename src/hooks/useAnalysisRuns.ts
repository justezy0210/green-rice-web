import { useEffect, useState } from 'react';
import { listAnalysisRuns } from '@/lib/analysis-run-service';
import type { AnalysisRun } from '@/types/analysis-run';

interface UseAnalysisRunsState {
  runs: AnalysisRun[];
  loading: boolean;
  error: Error | null;
}

/** One-shot listing of `analysis_runs` ordered by updatedAt desc. */
export function useAnalysisRuns(max = 50): UseAnalysisRunsState {
  const [state, setState] = useState<{
    runs: AnalysisRun[];
    error: Error | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    listAnalysisRuns(max)
      .then((runs) => {
        if (cancelled) return;
        setState({ runs, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          runs: [],
          error: err instanceof Error ? err : new Error(String(err)),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [max]);

  if (!state) return { runs: [], loading: true, error: null };
  return { runs: state.runs, loading: false, error: state.error };
}

import { useEffect, useState } from 'react';
import { subscribeAnalysisRun } from '@/lib/analysis-run-service';
import type { AnalysisRun, RunId } from '@/types/analysis-run';
import { decodeRunId } from '@/lib/analysis-run-id';

interface UseAnalysisRunState {
  run: AnalysisRun | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Subscribes to `analysis_runs/{runId}` in Firestore. Runs that have not
 * been materialised by `scripts/build-analysis-run.py` resolve to
 * `{ run: null }` — the UI should surface a "Run not found" message
 * rather than synthesise a placeholder.
 */
export function useAnalysisRun(runId: RunId | null | undefined): UseAnalysisRunState {
  const [firestore, setFirestore] = useState<{
    run: AnalysisRun | null;
    key: string;
  } | null>(null);

  useEffect(() => {
    if (!runId) return;
    const unsub = subscribeAnalysisRun(runId, (run) => {
      setFirestore({ run, key: runId });
    });
    return () => unsub();
  }, [runId]);

  if (!runId) {
    return { run: null, loading: false, error: null };
  }
  if (!decodeRunId(runId)) {
    return { run: null, loading: false, error: new Error(`Invalid runId: ${runId}`) };
  }
  if (!firestore || firestore.key !== runId) {
    return { run: null, loading: true, error: null };
  }
  return { run: firestore.run, loading: false, error: null };
}

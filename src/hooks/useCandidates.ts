import { useEffect, useState } from 'react';
import { fetchCandidates, fetchCandidate } from '@/lib/analysis-run-service';
import type { Candidate } from '@/types/candidate';
import type { RunId } from '@/types/analysis-run';

interface CandidatesState {
  candidates: Candidate[];
  loading: boolean;
  error: Error | null;
}

/**
 * Returns candidates for a run from Firestore
 * (`analysis_runs/{runId}/candidates`, produced by
 * `scripts/build-analysis-run.py`). Dataset is the product; the UI does
 * not recompute scoring.
 */
export function useCandidates(runId: RunId | null | undefined): CandidatesState {
  const [state, setState] = useState<{
    candidates: Candidate[];
    error: Error | null;
    key: string;
  } | null>(null);

  useEffect(() => {
    if (!runId) return;
    let cancelled = false;
    fetchCandidates(runId)
      .then((list) => {
        if (cancelled) return;
        setState({ candidates: list, error: null, key: runId });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          candidates: [],
          error: err instanceof Error ? err : new Error(String(err)),
          key: runId,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [runId]);

  if (!runId) return { candidates: [], loading: false, error: null };
  if (!state || state.key !== runId) {
    return { candidates: [], loading: true, error: null };
  }
  return { candidates: state.candidates, loading: false, error: state.error };
}

interface CandidateState {
  candidate: Candidate | null;
  loading: boolean;
  error: Error | null;
}

export function useCandidate(
  runId: RunId | null | undefined,
  candidateId: string | null | undefined,
): CandidateState {
  const [state, setState] = useState<{
    candidate: Candidate | null;
    error: Error | null;
    key: string;
  } | null>(null);

  const compositeKey = runId && candidateId ? `${runId}:${candidateId}` : '';

  useEffect(() => {
    if (!runId || !candidateId) return;
    let cancelled = false;
    fetchCandidate(runId, candidateId)
      .then((c) => {
        if (cancelled) return;
        setState({ candidate: c, error: null, key: compositeKey });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          candidate: null,
          error: err instanceof Error ? err : new Error(String(err)),
          key: compositeKey,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [runId, candidateId, compositeKey]);

  if (!runId || !candidateId) {
    return { candidate: null, loading: false, error: null };
  }
  if (!state || state.key !== compositeKey) {
    return { candidate: null, loading: true, error: null };
  }
  return { candidate: state.candidate, loading: false, error: state.error };
}

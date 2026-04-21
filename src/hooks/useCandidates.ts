import { useEffect, useState } from 'react';
import { fetchCandidates, fetchCandidate } from '@/lib/analysis-run-service';
import { useDerivedCandidates } from '@/hooks/useDerivedCandidates';
import type { Candidate } from '@/types/candidate';
import type { RunId } from '@/types/analysis-run';

interface CandidatesState {
  candidates: Candidate[];
  loading: boolean;
  source: 'firestore' | 'derived' | 'none';
  error: Error | null;
}

/**
 * Returns candidates for a run. Prefers Firestore
 * (`analysis_runs/{runId}/candidates`) when present — that is the canonical
 * Phase 2B+ source, produced by `scripts/build-analysis-run.py`. Falls back
 * to the Phase 2A client-side derivation (`useDerivedCandidates`) when the
 * Firestore collection is empty, so the UI remains usable even before the
 * server precompute has run.
 */
export function useCandidates(runId: RunId | null | undefined): CandidatesState {
  const derived = useDerivedCandidates(runId ?? null);
  const [firestore, setFirestore] = useState<{
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
        setFirestore({ candidates: list, error: null, key: runId });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setFirestore({
          candidates: [],
          error: err instanceof Error ? err : new Error(String(err)),
          key: runId,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [runId]);

  if (!runId) return { candidates: [], loading: false, source: 'none', error: null };
  if (!firestore || firestore.key !== runId) {
    return { candidates: [], loading: true, source: 'none', error: null };
  }
  if (firestore.candidates.length > 0) {
    return {
      candidates: firestore.candidates,
      loading: false,
      source: 'firestore',
      error: null,
    };
  }
  return {
    candidates: derived.candidates,
    loading: derived.loading,
    source: derived.candidates.length > 0 ? 'derived' : 'none',
    error: firestore.error ?? derived.error,
  };
}

interface CandidateState {
  candidate: Candidate | null;
  loading: boolean;
  source: 'firestore' | 'derived' | 'none';
  error: Error | null;
}

export function useCandidate(
  runId: RunId | null | undefined,
  candidateId: string | null | undefined,
): CandidateState {
  const derived = useDerivedCandidates(runId ?? null);
  const [firestore, setFirestore] = useState<{
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
        setFirestore({ candidate: c, error: null, key: compositeKey });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setFirestore({
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
    return { candidate: null, loading: false, source: 'none', error: null };
  }
  if (!firestore || firestore.key !== compositeKey) {
    return { candidate: null, loading: true, source: 'none', error: null };
  }
  if (firestore.candidate) {
    return { candidate: firestore.candidate, loading: false, source: 'firestore', error: null };
  }
  const derivedMatch = derived.candidates.find((c) => c.candidateId === candidateId);
  return {
    candidate: derivedMatch ?? null,
    loading: derived.loading,
    source: derivedMatch ? 'derived' : 'none',
    error: firestore.error ?? derived.error,
  };
}

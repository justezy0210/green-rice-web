import { useMemo } from 'react';
import { useOrthogroupDiff } from '@/hooks/useOrthogroupDiff';
import { useOrthogroupDiffEntries } from '@/hooks/useOrthogroupDiffEntries';
import { deriveCandidates } from '@/lib/candidate-scoring';
import { decodeRunId } from '@/lib/analysis-run-id';
import type { Candidate } from '@/types/candidate';
import type { RunId } from '@/types/analysis-run';

interface UseDerivedCandidatesResult {
  candidates: Candidate[];
  loading: boolean;
  error: Error | null;
}

/**
 * Phase 2A: derives candidates client-side from the existing
 * orthogroup_diffs data. Phase 2B replaces this with reads from
 * `analysis_runs/{runId}/candidates/` Firestore / Storage.
 */
export function useDerivedCandidates(runId: RunId | null): UseDerivedCandidatesResult {
  const parts = runId ? decodeRunId(runId) : null;
  const traitId = parts?.traitId ?? null;
  const { doc, loading } = useOrthogroupDiff(traitId);
  const entriesState = useOrthogroupDiffEntries(doc);

  return useMemo<UseDerivedCandidatesResult>(() => {
    if (!runId || !parts) {
      return { candidates: [], loading: false, error: null };
    }
    if (loading) {
      return { candidates: [], loading: true, error: null };
    }
    const entries =
      entriesState.kind === 'ready'
        ? entriesState.payload.entries
        : entriesState.kind === 'legacy'
          ? entriesState.entries
          : [];
    if (entries.length === 0) {
      return { candidates: [], loading: false, error: null };
    }
    const candidates = deriveCandidates({
      runId,
      traitId: parts.traitId,
      entries,
      scoringVersion: parts.scoringVersion,
    });
    return { candidates, loading: false, error: null };
  }, [runId, parts, loading, entriesState]);
}

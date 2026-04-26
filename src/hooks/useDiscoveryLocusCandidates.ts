import { useEffect, useMemo, useState } from 'react';
import { listCandidatesInBlock } from '@/lib/block-service';
import type { CandidateBlock } from '@/types/candidate-block';
import type { Candidate } from '@/types/candidate';

interface DiscoveryLocusCandidatesState {
  candidates: Candidate[];
  loading: boolean;
  error: Error | null;
}

export function useDiscoveryLocusCandidates(
  blocks: CandidateBlock[] | null | undefined,
): DiscoveryLocusCandidatesState {
  const blockRefs = useMemo(
    () =>
      (blocks ?? []).map((block) => ({
        runId: block.runId,
        blockId: block.blockId,
      })),
    [blocks],
  );
  const key = blockRefs.map((ref) => `${ref.runId}:${ref.blockId}`).join('|');
  const [state, setState] = useState<{
    key: string;
    candidates: Candidate[];
    error: Error | null;
  } | null>(null);

  useEffect(() => {
    if (blockRefs.length === 0) return;

    let cancelled = false;
    Promise.all(
      blockRefs.map((ref) =>
        listCandidatesInBlock(ref.runId, ref.blockId).then((rows) => rows as unknown as Candidate[]),
      ),
    )
      .then((sets) => {
        if (cancelled) return;
        const byCandidate = new Map<string, Candidate>();
        for (const candidate of sets.flat()) {
          byCandidate.set(`${candidate.runId}:${candidate.candidateId}`, candidate);
        }
        setState({
          key,
          candidates: Array.from(byCandidate.values()).sort(sortCandidates),
          error: null,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          key,
          candidates: [],
          error: err instanceof Error ? err : new Error(String(err)),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [blockRefs, key]);

  if (blockRefs.length === 0) return { candidates: [], loading: false, error: null };
  if (!state || state.key !== key) return { candidates: [], loading: true, error: null };
  return { candidates: state.candidates, loading: false, error: state.error };
}

function sortCandidates(a: Candidate, b: Candidate): number {
  if (a.traitId !== b.traitId) return a.traitId.localeCompare(b.traitId);
  return a.rank - b.rank;
}

import { useEffect, useMemo, useState } from 'react';
import { listBlocks } from '@/lib/block-service';
import type { AnalysisRun } from '@/types/analysis-run';
import type { CandidateBlock } from '@/types/candidate-block';

interface DiscoveryBlocksState {
  blocks: CandidateBlock[];
  loading: boolean;
  error: Error | null;
}

export function useDiscoveryBlocks(runs: AnalysisRun[]): DiscoveryBlocksState {
  const runIds = useMemo(() => runs.map((run) => run.runId), [runs]);
  const key = runIds.join('|');
  const [state, setState] = useState<{
    key: string;
    blocks: CandidateBlock[];
    error: Error | null;
  } | null>(null);

  useEffect(() => {
    if (runIds.length === 0) {
      return;
    }

    let cancelled = false;
    Promise.all(
      runIds.map((runId) =>
        listBlocks(runId).catch((err: unknown) => {
          throw err instanceof Error ? err : new Error(String(err));
        }),
      ),
    )
      .then((blockSets) => {
        if (cancelled) return;
        setState({ key, blocks: blockSets.flat(), error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          key,
          blocks: [],
          error: err instanceof Error ? err : new Error(String(err)),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [key, runIds]);

  if (runIds.length === 0) return { blocks: [], loading: false, error: null };
  if (!state || state.key !== key) return { blocks: [], loading: true, error: null };
  return { blocks: state.blocks, loading: false, error: state.error };
}

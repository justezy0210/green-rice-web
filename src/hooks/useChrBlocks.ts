import { useEffect, useState } from 'react';
import { findChrBlocks } from '@/lib/overlapping-blocks';
import type { CandidateBlock } from '@/types/candidate-block';

interface State {
  blocks: CandidateBlock[];
  loading: boolean;
  error: Error | null;
}

/**
 * All candidate blocks on a given chromosome, across runs. Used by
 * the chromosome overview — unlike `useOverlappingBlocks`, the
 * result is not tied to the current window, so navigating inside the
 * chromosome does not hide blocks that fall outside the new window.
 */
export function useChrBlocks(chr: string | null | undefined): State {
  const [state, setState] = useState<{
    blocks: CandidateBlock[];
    error: Error | null;
    key: string;
  } | null>(null);
  const key = chr ?? '';
  useEffect(() => {
    if (!chr) return;
    let cancelled = false;
    findChrBlocks(chr)
      .then((blocks) => {
        if (cancelled) return;
        setState({ blocks, error: null, key });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const error = err instanceof Error ? err : new Error(String(err));
        console.error('[useChrBlocks] query failed', error);
        setState({ blocks: [], error, key });
      });
    return () => {
      cancelled = true;
    };
  }, [chr, key]);
  if (!chr) return { blocks: [], loading: false, error: null };
  if (!state || state.key !== key) return { blocks: [], loading: true, error: null };
  return { blocks: state.blocks, loading: false, error: state.error };
}

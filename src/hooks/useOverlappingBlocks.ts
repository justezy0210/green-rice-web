import { useEffect, useState } from 'react';
import { findOverlappingBlocks } from '@/lib/overlapping-blocks';
import type { CandidateBlock } from '@/types/candidate-block';

interface State {
  blocks: CandidateBlock[];
  loading: boolean;
  error: Error | null;
}

export function useOverlappingBlocks(args: {
  chr: string | null | undefined;
  start: number | null | undefined;
  end: number | null | undefined;
}): State {
  const [state, setState] = useState<{
    blocks: CandidateBlock[];
    error: Error | null;
    key: string;
  } | null>(null);
  const key =
    args.chr && args.start != null && args.end != null
      ? `${args.chr}:${args.start}-${args.end}`
      : '';
  useEffect(() => {
    if (!args.chr || args.start == null || args.end == null) return;
    let cancelled = false;
    findOverlappingBlocks({ chr: args.chr, start: args.start, end: args.end, limit: 20 })
      .then((blocks) => {
        if (cancelled) return;
        setState({ blocks, error: null, key });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          blocks: [],
          error: err instanceof Error ? err : new Error(String(err)),
          key,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [args.chr, args.start, args.end, key]);

  if (!args.chr || args.start == null || args.end == null) {
    return { blocks: [], loading: false, error: null };
  }
  if (!state || state.key !== key) {
    return { blocks: [], loading: true, error: null };
  }
  return { blocks: state.blocks, loading: false, error: state.error };
}

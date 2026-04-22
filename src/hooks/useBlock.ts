import { useEffect, useState } from 'react';
import {
  fetchBlock,
  listBlocks,
  listCandidatesInBlock,
  fetchOgIntersectionBundle,
} from '@/lib/block-service';
import type { CandidateBlock } from '@/types/candidate-block';
import type { OgIntersectionBundle } from '@/types/intersection';
import type { RunId } from '@/types/analysis-run';
import type { Candidate } from '@/types/candidate';

interface BlockState {
  block: CandidateBlock | null;
  loading: boolean;
  error: Error | null;
}

export function useBlock(
  runId: RunId | null | undefined,
  blockId: string | null | undefined,
): BlockState {
  const [state, setState] = useState<{ block: CandidateBlock | null; key: string } | null>(
    null,
  );
  const key = runId && blockId ? `${runId}:${blockId}` : '';
  useEffect(() => {
    if (!runId || !blockId) return;
    let cancelled = false;
    fetchBlock(runId, blockId)
      .then((b) => {
        if (cancelled) return;
        setState({ block: b, key });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ block: null, key });
      });
    return () => {
      cancelled = true;
    };
  }, [runId, blockId, key]);

  if (!runId || !blockId) return { block: null, loading: false, error: null };
  if (!state || state.key !== key) return { block: null, loading: true, error: null };
  return { block: state.block, loading: false, error: null };
}

interface BlocksState {
  blocks: CandidateBlock[];
  loading: boolean;
  error: Error | null;
}

export function useBlocks(runId: RunId | null | undefined): BlocksState {
  const [state, setState] = useState<{ blocks: CandidateBlock[]; key: string } | null>(
    null,
  );
  useEffect(() => {
    if (!runId) return;
    let cancelled = false;
    listBlocks(runId)
      .then((list) => {
        if (cancelled) return;
        setState({ blocks: list, key: runId });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ blocks: [], key: runId });
      });
    return () => {
      cancelled = true;
    };
  }, [runId]);
  if (!runId) return { blocks: [], loading: false, error: null };
  if (!state || state.key !== runId) return { blocks: [], loading: true, error: null };
  return { blocks: state.blocks, loading: false, error: null };
}

interface BlockCandidatesState {
  candidates: Candidate[];
  loading: boolean;
  error: Error | null;
}

export function useBlockCandidates(
  runId: RunId | null | undefined,
  blockId: string | null | undefined,
): BlockCandidatesState {
  const [state, setState] = useState<{ candidates: Candidate[]; key: string } | null>(null);
  const key = runId && blockId ? `${runId}:${blockId}` : '';
  useEffect(() => {
    if (!runId || !blockId) return;
    let cancelled = false;
    listCandidatesInBlock(runId, blockId)
      .then((rows) => {
        if (cancelled) return;
        setState({ candidates: rows as unknown as Candidate[], key });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ candidates: [], key });
      });
    return () => {
      cancelled = true;
    };
  }, [runId, blockId, key]);
  if (!runId || !blockId) return { candidates: [], loading: false, error: null };
  if (!state || state.key !== key) return { candidates: [], loading: true, error: null };
  return { candidates: state.candidates, loading: false, error: null };
}

interface OgIntersectionBundleState {
  bundle: OgIntersectionBundle | null;
  loading: boolean;
  error: Error | null;
}

export function useOgIntersectionBundle(
  intersectionReleaseId: string | null | undefined,
  ogId: string | null | undefined,
): OgIntersectionBundleState {
  const [state, setState] = useState<{
    bundle: OgIntersectionBundle | null;
    key: string;
  } | null>(null);
  const key = intersectionReleaseId && ogId ? `${intersectionReleaseId}:${ogId}` : '';
  useEffect(() => {
    if (!intersectionReleaseId || !ogId) return;
    let cancelled = false;
    fetchOgIntersectionBundle(intersectionReleaseId, ogId)
      .then((b) => {
        if (cancelled) return;
        setState({ bundle: b, key });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ bundle: null, key });
      });
    return () => {
      cancelled = true;
    };
  }, [intersectionReleaseId, ogId, key]);
  if (!intersectionReleaseId || !ogId) return { bundle: null, loading: false, error: null };
  if (!state || state.key !== key) return { bundle: null, loading: true, error: null };
  return { bundle: state.bundle, loading: false, error: null };
}

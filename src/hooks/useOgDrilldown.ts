import { useEffect, useState } from 'react';
import {
  chunkKeyForOg,
  fetchBaegilmiAnnotation,
  fetchOgChunk,
  NotFoundError,
} from '@/lib/orthogroup-service';
import type {
  BaegilmiGeneAnnotation,
  OgMembersChunk,
} from '@/types/orthogroup-artifacts';

interface UseOgDrilldownResult {
  /** cultivarId → gene[] for the selected OG */
  members: Record<string, string[]> | null;
  annotation: BaegilmiGeneAnnotation | null;
  loading: boolean;
  error: string | null;
}

type State = {
  key: string;
  members: Record<string, string[]> | null;
  annotation: BaegilmiGeneAnnotation | null;
  error: string | null;
};
const EMPTY_STATE: State = { key: '', members: null, annotation: null, error: null };

export function useOgDrilldown(
  ogId: string | null,
  orthofinderVersion: number | null,
): UseOgDrilldownResult {
  const validVersion = orthofinderVersion != null && orthofinderVersion > 0 ? orthofinderVersion : 0;
  const key = ogId && validVersion ? `${ogId}|${validVersion}` : '';
  const [state, setState] = useState<State>(EMPTY_STATE);

  useEffect(() => {
    if (!ogId || !validVersion) return;

    const controller = new AbortController();
    const chunkKey = chunkKeyForOg(ogId);

    Promise.allSettled([
      fetchOgChunk(validVersion, chunkKey, controller.signal),
      fetchBaegilmiAnnotation(validVersion, controller.signal),
    ]).then(([chunkResult, annotationResult]) => {
      if (controller.signal.aborted) return;

      let members: Record<string, string[]> | null = null;
      let error: string | null = null;

      // Chunk is required for drilldown; annotation is optional.
      if (chunkResult.status === 'rejected') {
        const err = chunkResult.reason;
        if (err instanceof NotFoundError) {
          error = 'This orthofinder version has no gene-member chunks. Re-upload to enable drilldown.';
        } else if (err?.name === 'AbortError') {
          return; // superseded
        } else {
          error = err instanceof Error ? err.message : 'Failed to load members';
        }
      } else {
        members = extractMembers(chunkResult.value, ogId);
      }

      const annotation = annotationResult.status === 'fulfilled' ? annotationResult.value : null;
      setState({ key, members, annotation, error });
    });

    return () => controller.abort();
  }, [ogId, validVersion, key]);

  const isCurrent = state.key === key;
  return {
    members: isCurrent ? state.members : null,
    annotation: isCurrent ? state.annotation : null,
    loading: Boolean(key) && !isCurrent,
    error: isCurrent ? state.error : null,
  };
}

function extractMembers(chunk: OgMembersChunk, ogId: string): Record<string, string[]> | null {
  return chunk.ogs[ogId] ?? null;
}

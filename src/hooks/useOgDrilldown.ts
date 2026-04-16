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

export function useOgDrilldown(
  ogId: string | null,
  orthofinderVersion: number | null,
): UseOgDrilldownResult {
  const [members, setMembers] = useState<Record<string, string[]> | null>(null);
  const [annotation, setAnnotation] = useState<BaegilmiGeneAnnotation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ogId || orthofinderVersion == null || orthofinderVersion <= 0) {
      setMembers(null);
      setAnnotation(null);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const chunkKey = chunkKeyForOg(ogId);

    Promise.allSettled([
      fetchOgChunk(orthofinderVersion, chunkKey, controller.signal),
      fetchBaegilmiAnnotation(orthofinderVersion, controller.signal),
    ]).then(([chunkResult, annotationResult]) => {
      if (controller.signal.aborted) return;

      // Chunk is required for drilldown; annotation is optional.
      if (chunkResult.status === 'rejected') {
        const err = chunkResult.reason;
        if (err instanceof NotFoundError) {
          setError('This orthofinder version has no gene-member chunks. Re-upload to enable drilldown.');
        } else if (err?.name === 'AbortError') {
          return; // superseded
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load members');
        }
        setMembers(null);
      } else {
        setMembers(extractMembers(chunkResult.value, ogId));
      }

      if (annotationResult.status === 'fulfilled') {
        setAnnotation(annotationResult.value);
      } else {
        setAnnotation(null);
      }

      setLoading(false);
    });

    return () => controller.abort();
  }, [ogId, orthofinderVersion]);

  return { members, annotation, loading, error };
}

function extractMembers(chunk: OgMembersChunk, ogId: string): Record<string, string[]> | null {
  return chunk.ogs[ogId] ?? null;
}

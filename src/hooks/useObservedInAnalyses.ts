import { useEffect, useState } from 'react';
import { fetchEntityAnalysisIndex } from '@/lib/entity-analysis-index-service';
import type {
  EntityAnalysisLink,
  EntityBlockLink,
  EntityType,
} from '@/types/candidate';

interface UseObservedInAnalysesState {
  links: EntityAnalysisLink[];
  blocks: EntityBlockLink[];
  loading: boolean;
  error: Error | null;
}

/**
 * Reads `entity_analysis_index/{entityType}_{entityId}` and returns both
 * the legacy topCandidates list and the Phase A topBlocks list. Consumers
 * pick whichever applies.
 */
export function useObservedInAnalyses(
  entityType: EntityType | null | undefined,
  entityId: string | null | undefined,
): UseObservedInAnalysesState {
  const [resolved, setResolved] = useState<{
    links: EntityAnalysisLink[];
    blocks: EntityBlockLink[];
    error: Error | null;
    key: string;
  } | null>(null);

  const key = entityType && entityId ? `${entityType}:${entityId}` : '';

  useEffect(() => {
    if (!entityType || !entityId) return;
    let cancelled = false;
    fetchEntityAnalysisIndex(entityType, entityId)
      .then((idx) => {
        if (cancelled) return;
        setResolved({
          links: idx?.topCandidates ?? [],
          blocks: idx?.topBlocks ?? [],
          error: null,
          key,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setResolved({
          links: [],
          blocks: [],
          error: err instanceof Error ? err : new Error(String(err)),
          key,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [entityType, entityId, key]);

  if (!entityType || !entityId) {
    return { links: [], blocks: [], loading: false, error: null };
  }
  if (!resolved || resolved.key !== key) {
    return { links: [], blocks: [], loading: true, error: null };
  }
  return {
    links: resolved.links,
    blocks: resolved.blocks,
    loading: false,
    error: resolved.error,
  };
}

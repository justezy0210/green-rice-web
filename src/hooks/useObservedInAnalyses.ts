import { useEffect, useState } from 'react';
import { fetchEntityAnalysisIndex } from '@/lib/entity-analysis-index-service';
import type { EntityAnalysisLink, EntityType } from '@/types/candidate';

interface UseObservedInAnalysesState {
  links: EntityAnalysisLink[];
  loading: boolean;
  error: Error | null;
}

/**
 * Reads `entity_analysis_index/{entityType}_{entityId}` so entity pages can
 * render an "Observed in analyses" backlink panel. Returns an empty list
 * until the Phase 2B precompute has populated the index.
 */
export function useObservedInAnalyses(
  entityType: EntityType | null | undefined,
  entityId: string | null | undefined,
): UseObservedInAnalysesState {
  const [resolved, setResolved] = useState<{
    links: EntityAnalysisLink[];
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
        setResolved({ links: idx?.topCandidates ?? [], error: null, key });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setResolved({
          links: [],
          error: err instanceof Error ? err : new Error(String(err)),
          key,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [entityType, entityId, key]);

  if (!entityType || !entityId) {
    return { links: [], loading: false, error: null };
  }
  if (!resolved || resolved.key !== key) {
    return { links: [], loading: true, error: null };
  }
  return { links: resolved.links, loading: false, error: resolved.error };
}

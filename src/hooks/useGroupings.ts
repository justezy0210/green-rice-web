import { useEffect, useState, useMemo } from 'react';
import { subscribeGrouping, assignmentsToComparisonGroups } from '@/lib/grouping-service';
import type {
  TraitId,
  GroupingDocument,
  GroupingSummary,
  TraitQuality,
  CultivarGroupAssignment,
} from '@/types/grouping';
import type { ComparisonGroup } from '@/types/common';

interface UseGroupingsResult {
  comparisonGroups: ComparisonGroup[];
  assignments: Record<string, CultivarGroupAssignment>;
  summary: GroupingSummary | null;
  quality: TraitQuality | null;
  loading: boolean;
  staleCultivars: string[];
}

export function useGroupings(
  traitId: TraitId | null,
  cultivarNameMap: Record<string, string>,
): UseGroupingsResult {
  const [document, setDocument] = useState<GroupingDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!traitId) {
      setDocument(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeGrouping(traitId, (doc) => {
      setDocument(doc);
      setLoading(false);
    });
    return unsub;
  }, [traitId]);

  const result = useMemo(() => {
    if (!document) {
      return {
        comparisonGroups: [],
        assignments: {},
        summary: null,
        quality: null,
        staleCultivars: [],
      };
    }
    const comparisonGroups = assignmentsToComparisonGroups(
      document.assignments,
      cultivarNameMap,
    );
    // Identify cultivars in grouping that are no longer in nameMap
    const staleCultivars = Object.keys(document.assignments).filter(
      (cid) => !cultivarNameMap[cid],
    );
    return {
      comparisonGroups,
      assignments: document.assignments,
      summary: document.summary,
      quality: document.quality,
      staleCultivars,
    };
  }, [document, cultivarNameMap]);

  return { ...result, loading };
}

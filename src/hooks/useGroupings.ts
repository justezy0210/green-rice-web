import { useEffect, useState, useMemo } from 'react';
import { subscribeGrouping } from '@/lib/grouping-service';
import type {
  TraitId,
  GroupingDocument,
  GroupingSummary,
  TraitQuality,
  CultivarGroupAssignment,
} from '@/types/grouping';

interface UseGroupingsResult {
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
        assignments: {},
        summary: null,
        quality: null,
        staleCultivars: [],
      };
    }
    const staleCultivars = Object.keys(document.assignments).filter(
      (cid) => !cultivarNameMap[cid],
    );
    return {
      assignments: document.assignments,
      summary: document.summary,
      quality: document.quality,
      staleCultivars,
    };
  }, [document, cultivarNameMap]);

  return { ...result, loading };
}

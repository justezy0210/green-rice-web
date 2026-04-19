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

type State = { key: string; document: GroupingDocument | null; resolved: boolean };
const EMPTY_STATE: State = { key: '', document: null, resolved: false };

export function useGroupings(
  traitId: TraitId | null,
  cultivarNameMap: Record<string, string>,
): UseGroupingsResult {
  const key = traitId ?? '';
  const [state, setState] = useState<State>(EMPTY_STATE);

  useEffect(() => {
    if (!traitId) return;
    const unsub = subscribeGrouping(traitId, (doc) => {
      setState({ key, document: doc, resolved: true });
    });
    return unsub;
  }, [traitId, key]);

  const isCurrent = state.key === key;
  const document = isCurrent ? state.document : null;

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

  return {
    ...result,
    loading: Boolean(traitId) && (!isCurrent || !state.resolved),
  };
}

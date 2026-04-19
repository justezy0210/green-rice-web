import { useEffect, useMemo, useState } from 'react';
import { subscribeOrthogroupDiff } from '@/lib/orthogroup-service';
import { subscribeGrouping } from '@/lib/grouping-service';
import type { OrthogroupDiffDocument } from '@/types/orthogroup';
import type { GroupingDocument, TraitId } from '@/types/grouping';

interface UseOrthogroupDiffResult {
  doc: OrthogroupDiffDocument | null;
  groupingDoc: GroupingDocument | null;
  isStale: boolean;
  loading: boolean;
}

type State = {
  key: string;
  doc: OrthogroupDiffDocument | null;
  groupingDoc: GroupingDocument | null;
  diffResolved: boolean;
  groupingResolved: boolean;
};
const EMPTY_STATE: State = {
  key: '',
  doc: null,
  groupingDoc: null,
  diffResolved: false,
  groupingResolved: false,
};

export function useOrthogroupDiff(traitId: TraitId | null): UseOrthogroupDiffResult {
  const key = traitId ?? '';
  const [state, setState] = useState<State>(EMPTY_STATE);

  useEffect(() => {
    if (!traitId) return;
    const unsubDiff = subscribeOrthogroupDiff(traitId, (d) => {
      setState((prev) =>
        prev.key === key
          ? { ...prev, doc: d, diffResolved: true }
          : { key, doc: d, groupingDoc: null, diffResolved: true, groupingResolved: false },
      );
    });
    const unsubGrouping = subscribeGrouping(traitId, (d) => {
      setState((prev) =>
        prev.key === key
          ? { ...prev, groupingDoc: d, groupingResolved: true }
          : { key, doc: null, groupingDoc: d, diffResolved: false, groupingResolved: true },
      );
    });
    return () => {
      unsubDiff();
      unsubGrouping();
    };
  }, [traitId, key]);

  const isCurrent = state.key === key;
  const doc = isCurrent ? state.doc : null;
  const groupingDoc = isCurrent ? state.groupingDoc : null;

  const isStale = useMemo(() => {
    if (!doc || !groupingDoc) return false;
    return doc.groupingVersion !== groupingDoc.summary.version;
  }, [doc, groupingDoc]);

  return {
    doc,
    groupingDoc,
    isStale,
    loading:
      Boolean(traitId) && (!isCurrent || !state.diffResolved || !state.groupingResolved),
  };
}

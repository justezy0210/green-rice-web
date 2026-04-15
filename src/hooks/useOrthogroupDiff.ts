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

export function useOrthogroupDiff(traitId: TraitId | null): UseOrthogroupDiffResult {
  const [doc, setDoc] = useState<OrthogroupDiffDocument | null>(null);
  const [groupingDoc, setGroupingDoc] = useState<GroupingDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!traitId) {
      setDoc(null);
      setGroupingDoc(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    let diffLoaded = false;
    let groupingLoaded = false;
    const maybeDone = () => {
      if (diffLoaded && groupingLoaded) setLoading(false);
    };
    const unsubDiff = subscribeOrthogroupDiff(traitId, (d) => {
      setDoc(d);
      diffLoaded = true;
      maybeDone();
    });
    const unsubGrouping = subscribeGrouping(traitId, (d) => {
      setGroupingDoc(d);
      groupingLoaded = true;
      maybeDone();
    });
    return () => {
      unsubDiff();
      unsubGrouping();
    };
  }, [traitId]);

  const isStale = useMemo(() => {
    if (!doc || !groupingDoc) return false;
    return doc.groupingVersion !== groupingDoc.summary.version;
  }, [doc, groupingDoc]);

  return { doc, groupingDoc, isStale, loading };
}

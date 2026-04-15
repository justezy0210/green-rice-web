import { useEffect, useState } from 'react';
import { subscribeAllGroupings } from '@/lib/grouping-service';
import type { GroupingDocument } from '@/types/grouping';

interface UseAllGroupingsResult {
  groupings: Record<string, GroupingDocument>;
  loading: boolean;
}

export function useAllGroupings(): UseAllGroupingsResult {
  const [groupings, setGroupings] = useState<Record<string, GroupingDocument>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeAllGroupings((docs) => {
      setGroupings(docs);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { groupings, loading };
}

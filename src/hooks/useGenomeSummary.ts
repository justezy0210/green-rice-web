import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { GenomeSummary } from '@/types/genome';

export function useGenomeSummary(cultivarId: string | undefined) {
  const [summary, setSummary] = useState<GenomeSummary | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cultivarId) {
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(doc(db, 'cultivars', cultivarId), (snap) => {
      const data = snap.data();
      setSummary(data?.genomeSummary as GenomeSummary | undefined);
      setLoading(false);
    });

    return unsub;
  }, [cultivarId]);

  return { summary, loading };
}

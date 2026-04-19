import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { GenomeSummary } from '@/types/genome';

type State = {
  key: string;
  summary: GenomeSummary | undefined;
  resolved: boolean;
};
const EMPTY_STATE: State = { key: '', summary: undefined, resolved: false };

export function useGenomeSummary(cultivarId: string | undefined) {
  const key = cultivarId ?? '';
  const [state, setState] = useState<State>(EMPTY_STATE);

  useEffect(() => {
    if (!cultivarId) return;
    const unsub = onSnapshot(doc(db, 'cultivars', cultivarId), (snap) => {
      const data = snap.data();
      setState({
        key,
        summary: data?.genomeSummary as GenomeSummary | undefined,
        resolved: true,
      });
    });
    return unsub;
  }, [cultivarId, key]);

  const isCurrent = state.key === key;
  return {
    summary: isCurrent ? state.summary : undefined,
    loading: Boolean(cultivarId) && (!isCurrent || !state.resolved),
  };
}

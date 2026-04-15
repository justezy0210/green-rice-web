import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { OrthofinderState } from '@/types/orthogroup';

interface UseOrthofinderStatusResult {
  state: OrthofinderState | null;
  loading: boolean;
  error: string | null;
}

export function useOrthofinderStatus(enabled: boolean): UseOrthofinderStatusResult {
  const [state, setState] = useState<OrthofinderState | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      doc(db, '_orthofinder_meta', 'state'),
      (snap) => {
        setState(snap.exists() ? (snap.data() as OrthofinderState) : null);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return unsub;
  }, [enabled]);

  return { state, loading, error };
}

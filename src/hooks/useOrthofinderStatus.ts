import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { OrthofinderState } from '@/types/orthogroup';

interface UseOrthofinderStatusResult {
  state: OrthofinderState | null;
  loading: boolean;
  error: string | null;
}

type InternalState = {
  enabled: boolean;
  value: OrthofinderState | null;
  error: string | null;
  resolved: boolean;
};
const EMPTY_STATE: InternalState = {
  enabled: false,
  value: null,
  error: null,
  resolved: false,
};

export function useOrthofinderStatus(enabled: boolean): UseOrthofinderStatusResult {
  const [internal, setInternal] = useState<InternalState>(EMPTY_STATE);

  useEffect(() => {
    if (!enabled) return;
    const unsub = onSnapshot(
      doc(db, '_orthofinder_meta', 'state'),
      (snap) => {
        setInternal({
          enabled: true,
          value: snap.exists() ? (snap.data() as OrthofinderState) : null,
          error: null,
          resolved: true,
        });
      },
      (err) => {
        setInternal({ enabled: true, value: null, error: err.message, resolved: true });
      },
    );
    return unsub;
  }, [enabled]);

  const isCurrent = internal.enabled === enabled;
  return {
    state: isCurrent ? internal.value : null,
    error: isCurrent ? internal.error : null,
    loading: enabled && (!isCurrent || !internal.resolved),
  };
}

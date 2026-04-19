import { useEffect, useState } from 'react';
import { fetchOgGeneCoords } from '@/lib/orthogroup-service';
import type { OgGeneCoords } from '@/types/orthogroup';

type State = { key: string; data: OgGeneCoords | null };
const EMPTY_STATE: State = { key: '', data: null };

export function useOgGeneCoords(ogId: string | null): {
  data: OgGeneCoords | null;
  loading: boolean;
} {
  const key = ogId ?? '';
  const [state, setState] = useState<State>(EMPTY_STATE);

  useEffect(() => {
    if (!ogId) return;
    const controller = new AbortController();
    fetchOgGeneCoords(ogId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setState({ key, data: result });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ key, data: null });
      });
    return () => controller.abort();
  }, [ogId, key]);

  const isCurrent = state.key === key;
  return {
    data: isCurrent ? state.data : null,
    loading: Boolean(ogId) && !isCurrent,
  };
}

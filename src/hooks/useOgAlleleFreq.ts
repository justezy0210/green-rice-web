import { useEffect, useState } from 'react';
import { fetchOgAlleleFreq } from '@/lib/orthogroup-service';
import type { TraitId } from '@/types/grouping';
import type { OgAlleleFreqPayload } from '@/types/orthogroup';

type State = {
  key: string;
  data: OgAlleleFreqPayload | null;
};

const EMPTY_STATE: State = { key: '', data: null };

export function useOgAlleleFreq(
  traitId: TraitId | null,
  orthofinderVersion: number | null,
  groupingVersion: number | null,
): OgAlleleFreqPayload | null {
  const key = traitId && orthofinderVersion && groupingVersion
    ? `${traitId}|${orthofinderVersion}|${groupingVersion}`
    : '';

  const [state, setState] = useState<State>(EMPTY_STATE);

  useEffect(() => {
    if (!traitId || !orthofinderVersion || !groupingVersion) return;
    const controller = new AbortController();
    fetchOgAlleleFreq(traitId, orthofinderVersion, groupingVersion, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setState({ key, data: result });
      });
    return () => controller.abort();
  }, [traitId, orthofinderVersion, groupingVersion, key]);

  return state.key === key ? state.data : null;
}

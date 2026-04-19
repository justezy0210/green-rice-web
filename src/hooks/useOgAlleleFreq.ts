import { useEffect, useState } from 'react';
import { fetchOgAlleleFreq } from '@/lib/orthogroup-service';
import type { TraitId } from '@/types/grouping';
import type { OgAlleleFreqPayload } from '@/types/orthogroup';

export function useOgAlleleFreq(
  traitId: TraitId | null,
  orthofinderVersion: number | null,
  groupingVersion: number | null,
): OgAlleleFreqPayload | null {
  const [data, setData] = useState<OgAlleleFreqPayload | null>(null);

  useEffect(() => {
    if (!traitId || !orthofinderVersion || !groupingVersion) {
      setData(null);
      return;
    }
    const controller = new AbortController();
    fetchOgAlleleFreq(traitId, orthofinderVersion, groupingVersion, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      });
    return () => controller.abort();
  }, [traitId, orthofinderVersion, groupingVersion]);

  return data;
}

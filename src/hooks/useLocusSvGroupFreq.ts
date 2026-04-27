import { useEffect, useMemo, useState } from 'react';
import { fetchSvTraitGroupFreq } from '@/lib/sv-service';
import type {
  SvEventGroupFreq,
  SvTraitGroupFreqBundle,
} from '@/types/sv-event';
import type { TraitId } from '@/types/traits';

export interface LocusSvGroupFreqEntry {
  bundle: SvTraitGroupFreqBundle;
  byEvent: Record<string, SvEventGroupFreq>;
}

interface LocusSvGroupFreqState {
  byTrait: Partial<Record<TraitId, LocusSvGroupFreqEntry>>;
  loading: boolean;
  error: Error | null;
}

interface LoadedState {
  key: string;
  bundles: Partial<Record<TraitId, SvTraitGroupFreqBundle>>;
  error: Error | null;
}

export function useLocusSvGroupFreq(
  svReleaseId: string | null | undefined,
  traitIds: readonly TraitId[],
): LocusSvGroupFreqState {
  const traitKey = useMemo(
    () => Array.from(new Set(traitIds)).sort().join('|'),
    [traitIds],
  );
  const uniqueTraitIds = useMemo(
    () => (traitKey ? (traitKey.split('|') as TraitId[]) : []),
    [traitKey],
  );
  const compositeKey = svReleaseId && traitKey ? `${svReleaseId}:${traitKey}` : '';
  const [state, setState] = useState<LoadedState | null>(null);

  useEffect(() => {
    if (!svReleaseId || uniqueTraitIds.length === 0) return;
    let cancelled = false;

    Promise.allSettled(
      uniqueTraitIds.map((traitId) =>
        fetchSvTraitGroupFreq(svReleaseId, traitId).then((bundle) => ({
          traitId,
          bundle,
        })),
      ),
    ).then((results) => {
      if (cancelled) return;
      const bundles: Partial<Record<TraitId, SvTraitGroupFreqBundle>> = {};
      const errors: string[] = [];
      for (const result of results) {
        if (result.status === 'fulfilled') {
          bundles[result.value.traitId] = result.value.bundle;
        } else {
          errors.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
        }
      }
      setState({
        key: compositeKey,
        bundles,
        error: errors.length > 0 ? new Error(errors.join('; ')) : null,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [svReleaseId, uniqueTraitIds, compositeKey]);

  return useMemo(() => {
    if (!svReleaseId || uniqueTraitIds.length === 0) {
      return { byTrait: {}, loading: false, error: null };
    }
    if (!state || state.key !== compositeKey) {
      return { byTrait: {}, loading: true, error: null };
    }

    const byTrait: Partial<Record<TraitId, LocusSvGroupFreqEntry>> = {};
    for (const traitId of uniqueTraitIds) {
      const bundle = state.bundles[traitId];
      if (!bundle) continue;
      const byEvent: Record<string, SvEventGroupFreq> = {};
      for (const row of bundle.byEvent) {
        byEvent[row.eventId] = row;
      }
      byTrait[traitId] = { bundle, byEvent };
    }

    return { byTrait, loading: false, error: state.error };
  }, [svReleaseId, uniqueTraitIds, state, compositeKey]);
}

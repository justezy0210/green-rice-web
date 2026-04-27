import { useEffect, useMemo, useState } from 'react';
import {
  fetchSvChr,
  fetchSvManifest,
  fetchSvTraitGroupFreq,
} from '@/lib/sv-service';
import {
  canonicalizeSvEventId,
  svGroupSpread,
  svGroupsInOrder,
} from '@/lib/sv-event-helpers';
import type {
  SvEvent,
  SvManifest,
  SvTraitGroupFreqBundle,
  SvGroupFreq,
} from '@/types/sv-event';
import type { TraitId } from '@/types/traits';

interface SvEventLoadedState {
  key: string;
  manifest: SvManifest | null;
  event: SvEvent | null;
  samples: string[];
  loadedChrs: number;
  totalChrs: number;
  error: Error | null;
}

export interface SvEventState {
  manifest: SvManifest | null;
  event: SvEvent | null;
  samples: string[];
  loading: boolean;
  loadedChrs: number;
  totalChrs: number;
  error: Error | null;
  notFound: boolean;
}

export interface SvEventTraitPattern {
  traitId: TraitId;
  groupLabels: string[];
  groups: Array<{ label: string; freq: SvGroupFreq | null }>;
  spread: number | null;
}

interface TraitPatternLoadedState {
  key: string;
  bundles: Partial<Record<TraitId, SvTraitGroupFreqBundle>>;
  error: Error | null;
}

export interface SvEventTraitPatternState {
  rows: SvEventTraitPattern[];
  loading: boolean;
  error: Error | null;
}

export function useSvEvent(
  svReleaseId: string | null | undefined,
  rawEventId: string | null | undefined,
): SvEventState {
  const eventId = canonicalizeSvEventId(rawEventId);
  const key = svReleaseId && eventId ? `${svReleaseId}:${eventId}` : '';
  const [state, setState] = useState<SvEventLoadedState | null>(null);

  useEffect(() => {
    if (!svReleaseId || !eventId) return;
    let cancelled = false;

    fetchSvManifest(svReleaseId)
      .then(async (manifest) => {
        const chrs = Object.keys(manifest.chrCounts).sort();
        const results = await Promise.allSettled(
          chrs.map((chr) => fetchSvChr(svReleaseId, chr)),
        );
        if (cancelled) return;

        let event: SvEvent | null = null;
        let samples: string[] = [];
        const errors: string[] = [];

        for (const result of results) {
          if (result.status === 'rejected') {
            errors.push(
              result.reason instanceof Error ? result.reason.message : String(result.reason),
            );
            continue;
          }
          const bundle = result.value;
          if (samples.length === 0) samples = bundle.samples;
          if (!event) {
            event = bundle.events.find((candidate) => candidate.eventId === eventId) ?? null;
          }
        }

        setState({
          key,
          manifest,
          event,
          samples,
          loadedChrs: chrs.length - errors.length,
          totalChrs: chrs.length,
          error: errors.length > 0 && !event ? new Error(errors.join('; ')) : null,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          key,
          manifest: null,
          event: null,
          samples: [],
          loadedChrs: 0,
          totalChrs: 0,
          error: err instanceof Error ? err : new Error(String(err)),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [svReleaseId, eventId, key]);

  if (!svReleaseId || !eventId) {
    return {
      manifest: null,
      event: null,
      samples: [],
      loading: false,
      loadedChrs: 0,
      totalChrs: 0,
      error: null,
      notFound: false,
    };
  }

  if (!state || state.key !== key) {
    return {
      manifest: null,
      event: null,
      samples: [],
      loading: true,
      loadedChrs: 0,
      totalChrs: 0,
      error: null,
      notFound: false,
    };
  }

  return {
    manifest: state.manifest,
    event: state.event,
    samples: state.samples,
    loading: false,
    loadedChrs: state.loadedChrs,
    totalChrs: state.totalChrs,
    error: state.error,
    notFound: !state.error && !state.event,
  };
}

export function useSvEventTraitPatterns(
  svReleaseId: string | null | undefined,
  rawEventId: string | null | undefined,
  traitIds: readonly TraitId[],
): SvEventTraitPatternState {
  const eventId = canonicalizeSvEventId(rawEventId);
  const traitKey = useMemo(
    () => Array.from(new Set(traitIds)).sort().join('|'),
    [traitIds],
  );
  const uniqueTraitIds = useMemo(
    () => (traitKey ? (traitKey.split('|') as TraitId[]) : []),
    [traitKey],
  );
  const key = svReleaseId && eventId && traitKey ? `${svReleaseId}:${eventId}:${traitKey}` : '';
  const [state, setState] = useState<TraitPatternLoadedState | null>(null);

  useEffect(() => {
    if (!svReleaseId || !eventId || uniqueTraitIds.length === 0) return;
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
        key,
        bundles,
        error: errors.length > 0 ? new Error(errors.join('; ')) : null,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [svReleaseId, eventId, uniqueTraitIds, key]);

  return useMemo(() => {
    if (!svReleaseId || !eventId || uniqueTraitIds.length === 0) {
      return { rows: [], loading: false, error: null };
    }
    if (!state || state.key !== key) {
      return { rows: [], loading: true, error: null };
    }

    const rows: SvEventTraitPattern[] = [];
    for (const traitId of uniqueTraitIds) {
      const bundle = state.bundles[traitId];
      const freq = bundle?.byEvent.find((row) => row.eventId === eventId);
      if (!bundle || !freq) continue;
      rows.push({
        traitId,
        groupLabels: bundle.groupLabels,
        groups: svGroupsInOrder(freq, bundle.groupLabels),
        spread: svGroupSpread(freq),
      });
    }
    rows.sort((a, b) => (b.spread ?? -1) - (a.spread ?? -1) || a.traitId.localeCompare(b.traitId));

    return {
      rows,
      loading: false,
      error: state.error,
    };
  }, [svReleaseId, eventId, uniqueTraitIds, state, key]);
}

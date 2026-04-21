import { useEffect, useState, useMemo } from 'react';
import {
  fetchSvManifest,
  fetchSvChr,
  fetchSvTraitGroupFreq,
} from '@/lib/sv-service';
import type {
  SvChrBundle,
  SvEvent,
  SvEventGroupFreq,
  SvManifest,
  SvTraitGroupFreqBundle,
} from '@/types/sv-event';
import type { TraitId } from '@/types/traits';

interface ManifestState {
  manifest: SvManifest | null;
  loading: boolean;
  error: Error | null;
}

export function useSvManifest(svReleaseId: string | null | undefined): ManifestState {
  const [state, setState] = useState<{ manifest: SvManifest | null; key: string } | null>(null);

  useEffect(() => {
    if (!svReleaseId) return;
    let cancelled = false;
    fetchSvManifest(svReleaseId)
      .then((m) => {
        if (cancelled) return;
        setState({ manifest: m, key: svReleaseId });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({ manifest: null, key: svReleaseId });
        console.warn('sv manifest fetch failed', err);
      });
    return () => {
      cancelled = true;
    };
  }, [svReleaseId]);

  if (!svReleaseId) return { manifest: null, loading: false, error: null };
  if (!state || state.key !== svReleaseId) return { manifest: null, loading: true, error: null };
  return { manifest: state.manifest, loading: false, error: null };
}

interface AllEventsState {
  eventsByChr: Record<string, SvEvent[]>;
  samples: string[];
  loading: boolean;
  loadedChrs: number;
  totalChrs: number;
}

/**
 * Fetches all per-chr bundles for this svRelease and concatenates. Results
 * are cached in the service layer, so subsequent trait switches are cheap.
 * ~18k events at ~800 KB gzipped total — viable client-side.
 */
export function useAllSvEvents(svReleaseId: string | null | undefined, chrList: string[] | null): AllEventsState {
  const [bundles, setBundles] = useState<Record<string, SvChrBundle> | null>(null);

  useEffect(() => {
    if (!svReleaseId || !chrList || chrList.length === 0) return;
    let cancelled = false;
    const results: Record<string, SvChrBundle> = {};
    Promise.allSettled(
      chrList.map((chr) =>
        fetchSvChr(svReleaseId, chr).then((b) => {
          results[chr] = b;
        }),
      ),
    ).then(() => {
      if (cancelled) return;
      setBundles({ ...results });
    });
    return () => {
      cancelled = true;
    };
  }, [svReleaseId, chrList]);

  return useMemo(() => {
    if (!svReleaseId || !chrList) {
      return { eventsByChr: {}, samples: [], loading: false, loadedChrs: 0, totalChrs: 0 };
    }
    if (!bundles) {
      return { eventsByChr: {}, samples: [], loading: true, loadedChrs: 0, totalChrs: chrList.length };
    }
    const eventsByChr: Record<string, SvEvent[]> = {};
    let samples: string[] = [];
    for (const chr of chrList) {
      const b = bundles[chr];
      if (!b) continue;
      eventsByChr[chr] = b.events;
      if (samples.length === 0) samples = b.samples;
    }
    return {
      eventsByChr,
      samples,
      loading: false,
      loadedChrs: Object.keys(eventsByChr).length,
      totalChrs: chrList.length,
    };
  }, [bundles, chrList, svReleaseId]);
}

interface GroupFreqState {
  bundle: SvTraitGroupFreqBundle | null;
  /** eventId → per-group freq record (fast lookup). */
  byEvent: Record<string, SvEventGroupFreq>;
  loading: boolean;
  error: Error | null;
}

export function useSvTraitGroupFreq(
  svReleaseId: string | null | undefined,
  traitId: TraitId | null,
): GroupFreqState {
  const [state, setState] = useState<{
    bundle: SvTraitGroupFreqBundle | null;
    key: string;
    error: Error | null;
  } | null>(null);

  const compositeKey = svReleaseId && traitId ? `${svReleaseId}:${traitId}` : '';

  useEffect(() => {
    if (!svReleaseId || !traitId) return;
    let cancelled = false;
    fetchSvTraitGroupFreq(svReleaseId, traitId)
      .then((b) => {
        if (cancelled) return;
        setState({ bundle: b, key: compositeKey, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          bundle: null,
          key: compositeKey,
          error: err instanceof Error ? err : new Error(String(err)),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [svReleaseId, traitId, compositeKey]);

  return useMemo<GroupFreqState>(() => {
    if (!svReleaseId || !traitId) {
      return { bundle: null, byEvent: {}, loading: false, error: null };
    }
    if (!state || state.key !== compositeKey) {
      return { bundle: null, byEvent: {}, loading: true, error: null };
    }
    const byEvent: Record<string, SvEventGroupFreq> = {};
    for (const row of state.bundle?.byEvent ?? []) {
      byEvent[row.eventId] = row;
    }
    return { bundle: state.bundle, byEvent, loading: false, error: state.error };
  }, [svReleaseId, traitId, compositeKey, state]);
}

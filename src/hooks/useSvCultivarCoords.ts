import { useEffect, useMemo, useState } from 'react';
import { fetchSvCultivarCoords } from '@/lib/sv-service';
import type { SvCultivarCoord } from '@/types/sv-event';

interface State {
  /** eventId → sample-frame coord entry, for O(1) lookup. */
  byEvent: Map<string, SvCultivarCoord>;
  loading: boolean;
  error: Error | null;
  /** True once the fetch resolved and the bundle was non-empty. */
  available: boolean;
}

/**
 * Per-cultivar SV coordinate side-table for one chromosome. Joined
 * to the canonical `SvEvent` stream by `eventId` so callers can
 * render SV glyphs in a gene's own assembly frame rather than the
 * reference frame. Returns `available: false` when the side-table
 * is absent (not generated yet) — UI should hide cultivar-specific
 * SV overlays in that case rather than fall back to reference pos.
 */
export function useSvCultivarCoords(args: {
  svReleaseId: string | null | undefined;
  cultivar: string | null | undefined;
  chr: string | null | undefined;
}): State {
  const { svReleaseId, cultivar, chr } = args;
  const [state, setState] = useState<{
    entries: SvCultivarCoord[];
    error: Error | null;
    key: string;
  } | null>(null);
  const key =
    svReleaseId && cultivar && chr ? `${svReleaseId}:${cultivar}:${chr}` : '';

  useEffect(() => {
    if (!svReleaseId || !cultivar || !chr) return;
    let cancelled = false;
    fetchSvCultivarCoords(svReleaseId, cultivar, chr)
      .then((bundle) => {
        if (cancelled) return;
        setState({ entries: bundle.entries, error: null, key });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const error = err instanceof Error ? err : new Error(String(err));
        console.error('[useSvCultivarCoords] fetch failed', error);
        setState({ entries: [], error, key });
      });
    return () => {
      cancelled = true;
    };
  }, [svReleaseId, cultivar, chr, key]);

  const byEvent = useMemo(() => {
    const map = new Map<string, SvCultivarCoord>();
    if (state && state.key === key) {
      for (const e of state.entries) map.set(e.eventId, e);
    }
    return map;
  }, [state, key]);

  if (!svReleaseId || !cultivar || !chr) {
    return { byEvent, loading: false, error: null, available: false };
  }
  if (!state || state.key !== key) {
    return { byEvent, loading: true, error: null, available: false };
  }
  return {
    byEvent,
    loading: false,
    error: state.error,
    available: state.entries.length > 0,
  };
}

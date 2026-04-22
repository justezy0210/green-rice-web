import { useEffect, useMemo, useState } from 'react';
import { fetchSvChr } from '@/lib/sv-service';
import type { SvEvent } from '@/types/sv-event';

interface State {
  events: SvEvent[];
  loading: boolean;
  error: Error | null;
}

/**
 * Single-chromosome SV event fetch, filtered by a coordinate window.
 * Uses the cached `fetchSvChr` underneath so multiple consumers on
 * the same page share a single Storage read per chr bundle.
 */
export function useSvEventsForRegion(args: {
  svReleaseId: string | null | undefined;
  chr: string | null | undefined;
  start: number | null | undefined;
  end: number | null | undefined;
}): State {
  const { svReleaseId, chr, start, end } = args;
  const [state, setState] = useState<{
    events: SvEvent[];
    error: Error | null;
    key: string;
  } | null>(null);

  const key = svReleaseId && chr ? `${svReleaseId}:${chr}` : '';

  useEffect(() => {
    if (!svReleaseId || !chr) return;
    let cancelled = false;
    fetchSvChr(svReleaseId, chr)
      .then((bundle) => {
        if (cancelled) return;
        setState({ events: bundle.events, error: null, key });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          events: [],
          error: err instanceof Error ? err : new Error(String(err)),
          key,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [svReleaseId, chr, key]);

  const filtered = useMemo(() => {
    if (!state || state.key !== key) return [];
    if (start == null || end == null) return state.events;
    return state.events.filter((ev) => ev.pos >= start && ev.pos <= end);
  }, [state, key, start, end]);

  if (!svReleaseId || !chr) return { events: [], loading: false, error: null };
  if (!state || state.key !== key) return { events: [], loading: true, error: null };
  return { events: filtered, loading: false, error: state.error };
}

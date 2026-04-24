import { useEffect, useMemo, useState } from 'react';
import { fetchSvChr } from '@/lib/sv-service';
import type { SvEvent } from '@/types/sv-event';

interface State {
  events: SvEvent[];
  loading: boolean;
  error: Error | null;
}

export type SvScope = 'cultivar' | 'all';

/**
 * True when the VCF genotype string includes any ALT allele. Handles
 * phased/unphased separators and multi-allelic sites; `"0/0"`,
 * `"./."`, `"0|0"` all evaluate to false.
 */
function gtHasAlt(gt: string | undefined): boolean {
  if (!gt) return false;
  return gt.split(/[|/]/).some((a) => a !== '.' && a !== '0');
}

/**
 * Single-chromosome SV event fetch, filtered by a coordinate window
 * and — when `scope === 'cultivar'` — by whether the named cultivar
 * actually carries the ALT allele. Reference-anchored pangenome
 * calling produces many events the current cultivar lacks, so the
 * cultivar-scoped default matches the Region page URL contract
 * (`/region/:cultivar/...`); `scope === 'all'` preserves the
 * pangenome comparison view for trait-association follow-up.
 */
export function useSvEventsForRegion(args: {
  svReleaseId: string | null | undefined;
  chr: string | null | undefined;
  start: number | null | undefined;
  end: number | null | undefined;
  cultivar?: string | null;
  scope?: SvScope;
}): State {
  const { svReleaseId, chr, start, end, cultivar, scope = 'cultivar' } = args;
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
    return state.events.filter((ev) => {
      if (start != null && ev.pos < start) return false;
      if (end != null && ev.pos > end) return false;
      if (scope === 'cultivar') {
        if (!cultivar) return false;
        if (!gtHasAlt(ev.gts[cultivar])) return false;
      }
      return true;
    });
  }, [state, key, start, end, cultivar, scope]);

  if (!svReleaseId || !chr) return { events: [], loading: false, error: null };
  if (!state || state.key !== key) return { events: [], loading: true, error: null };
  return { events: filtered, loading: false, error: state.error };
}

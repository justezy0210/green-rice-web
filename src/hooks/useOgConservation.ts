import { useEffect, useMemo, useState } from 'react';
import { fetchOgConservation, type OgConservationBundle } from '@/lib/og-conservation';

interface State {
  bundle: OgConservationBundle | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Loads the compact per-OG copy-count bundle (~200 KB gzipped) so
 * Gene/OG detail can render a ConservationSummary without fetching
 * the 10 MB matrix. Shared cache across invocations.
 */
export function useOgConservation(
  orthofinderVersion: number | null | undefined,
): State {
  const [state, setState] = useState<{
    bundle: OgConservationBundle | null;
    error: Error | null;
    key: number;
  } | null>(null);

  useEffect(() => {
    if (orthofinderVersion == null) return;
    let cancelled = false;
    fetchOgConservation(orthofinderVersion)
      .then((bundle) => {
        if (cancelled) return;
        setState({ bundle, error: null, key: orthofinderVersion });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const error = err instanceof Error ? err : new Error(String(err));
        console.error('[useOgConservation] fetch failed', error);
        setState({ bundle: null, error, key: orthofinderVersion });
      });
    return () => {
      cancelled = true;
    };
  }, [orthofinderVersion]);

  return useMemo(() => {
    if (orthofinderVersion == null) {
      return { bundle: null, loading: false, error: null };
    }
    if (!state || state.key !== orthofinderVersion) {
      return { bundle: null, loading: true, error: null };
    }
    return { bundle: state.bundle, loading: false, error: state.error };
  }, [orthofinderVersion, state]);
}

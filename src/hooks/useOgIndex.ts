import { useEffect, useState } from 'react';
import { fetchOgIndex, type OgIndexBundle } from '@/lib/og-index-service';

interface State {
  bundle: OgIndexBundle | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Compact OG index (~200 KB gzipped) for the `/og` browse surface.
 * Fetched lazily when the route is entered; shared cache across
 * subsequent visits in the same session.
 */
export function useOgIndex(
  orthofinderVersion: number | null | undefined,
): State {
  const [state, setState] = useState<{
    bundle: OgIndexBundle | null;
    error: Error | null;
    key: number;
  } | null>(null);

  useEffect(() => {
    if (orthofinderVersion == null) return;
    let cancelled = false;
    fetchOgIndex(orthofinderVersion)
      .then((bundle) => {
        if (cancelled) return;
        setState({ bundle, error: null, key: orthofinderVersion });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const error = err instanceof Error ? err : new Error(String(err));
        console.error('[useOgIndex] fetch failed', error);
        setState({ bundle: null, error, key: orthofinderVersion });
      });
    return () => {
      cancelled = true;
    };
  }, [orthofinderVersion]);

  if (orthofinderVersion == null) {
    return { bundle: null, loading: false, error: null };
  }
  if (!state || state.key !== orthofinderVersion) {
    return { bundle: null, loading: true, error: null };
  }
  return { bundle: state.bundle, loading: false, error: state.error };
}

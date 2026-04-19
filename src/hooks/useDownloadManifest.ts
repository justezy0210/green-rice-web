import { useEffect, useState } from 'react';
import { ref as storageRef, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import type { DownloadManifest } from '@/types/download-manifest';

type State = { data: DownloadManifest | null; resolved: boolean; error: string | null };
const INITIAL: State = { data: null, resolved: false, error: null };

/**
 * Loads downloads/_manifest.json from Firebase Storage. This is the sole
 * source of the /download Discovery section's row list — per rev2 §9 the
 * UI never reads data/download_versions.json directly.
 */
export function useDownloadManifest(): {
  manifest: DownloadManifest | null;
  loading: boolean;
  error: string | null;
} {
  const [state, setState] = useState<State>(INITIAL);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = await getDownloadURL(storageRef(storage, 'downloads/_manifest.json'));
        const res = await fetch(url);
        if (!res.ok) throw new Error(`manifest fetch ${res.status}`);
        const data = (await res.json()) as DownloadManifest;
        if (!cancelled) setState({ data, resolved: true, error: null });
      } catch (err) {
        if (cancelled) return;
        setState({
          data: null,
          resolved: true,
          error: err instanceof Error ? err.message : 'manifest unavailable',
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { manifest: state.data, loading: !state.resolved, error: state.error };
}

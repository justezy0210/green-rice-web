import { useEffect, useState } from 'react';
import { publicDownloadUrl } from '@/lib/download-urls';
import type { DownloadManifest } from '@/types/download-manifest';

type State = { data: DownloadManifest | null; resolved: boolean; error: string | null };
const INITIAL: State = { data: null, resolved: false, error: null };

// Module-level cache so repeated hook uses across pages (DownloadPage +
// TraitDownloadCard on every Explore nav) reuse the same manifest fetch.
// The manifest is small (~7 KB) and changes only when a new (of, g)
// pair is promoted, so a coarse TTL is sufficient — long enough to
// absorb SPA navigation, short enough that a release flip surfaces
// without a full reload.
const CACHE_TTL_MS = 10 * 60 * 1000;
let cached: DownloadManifest | null = null;
let cachedAt = 0;
let inflight: Promise<DownloadManifest | null> | null = null;

function isCacheFresh(): boolean {
  return cached !== null && Date.now() - cachedAt < CACHE_TTL_MS;
}

async function loadManifest(): Promise<DownloadManifest | null> {
  if (isCacheFresh()) return cached;
  if (!inflight) {
    inflight = (async () => {
      try {
        const res = await fetch(publicDownloadUrl('downloads/_manifest.json'), {
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`manifest fetch ${res.status}`);
        const data = (await res.json()) as DownloadManifest;
        cached = data;
        cachedAt = Date.now();
        return data;
      } finally {
        inflight = null;
      }
    })();
  }
  return inflight;
}

// Kick the fetch as soon as this module is imported, so the cache is
// usually warm by the time the first component that reads the manifest
// renders. No await — the promise is tracked in `inflight`.
if (typeof window !== 'undefined') {
  void loadManifest().catch(() => {
    // Swallow here; individual hook callers still see the error state.
  });
}

/**
 * Loads downloads/_manifest.json from Firebase Storage. This is the sole
 * source of the /download Discovery section's row list — per rev2 §9 the
 * UI never reads data/download_versions.json directly.
 *
 * The manifest lives on a public-read prefix, so we hit its `?alt=media`
 * URL directly — no `getDownloadURL()` round-trip — and cache the
 * parsed result at module scope so switching between /download and
 * /explore doesn't refetch.
 */
export function useDownloadManifest(): {
  manifest: DownloadManifest | null;
  loading: boolean;
  error: string | null;
} {
  const [state, setState] = useState<State>(() =>
    isCacheFresh() ? { data: cached, resolved: true, error: null } : INITIAL,
  );

  useEffect(() => {
    if (state.resolved) return;
    let cancelled = false;
    loadManifest()
      .then((data) => {
        if (!cancelled) setState({ data, resolved: true, error: data ? null : 'manifest unavailable' });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            data: null,
            resolved: true,
            error: err instanceof Error ? err.message : 'manifest unavailable',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [state.resolved]);

  return { manifest: state.data, loading: !state.resolved, error: state.error };
}

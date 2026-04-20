/**
 * Region data fetch resolution — the core state transition used by
 * `useOgRegionAf` and `useOgRegionGraph`. Extracted as a pure function
 * so the state machine can be smoke-tested without React.
 *
 * Contract (see plan 2026-04-20-og-region-release-observability):
 *   HTTP 200 + JSON parse ok        → { data, status: 'ok' }
 *   HTTP 404                        → { data: null, status: 'missing' }
 *   HTTP 5xx / 403 / any throw      → { data: null, status: 'unavailable' }
 *
 * Abort handling belongs to the caller — pass a signal into fetch and
 * skip the returned result if `signal.aborted`. This function does not
 * observe abort signals directly.
 */

export type RegionResolvedStatus = 'ok' | 'missing' | 'unavailable';

export interface RegionResolvedResult<T> {
  data: T | null;
  status: RegionResolvedStatus;
}

export async function resolveRegionFetch<T>(
  fetchPromise: Promise<Response>,
): Promise<RegionResolvedResult<T>> {
  try {
    const res = await fetchPromise;
    if (res.status === 404) {
      return { data: null, status: 'missing' };
    }
    if (!res.ok) {
      return { data: null, status: 'unavailable' };
    }
    const data = (await res.json()) as T;
    return { data, status: 'ok' };
  } catch {
    return { data: null, status: 'unavailable' };
  }
}

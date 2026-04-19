import { useEffect, useState } from 'react';
import { fetchOrthogroupDiffPayload } from '@/lib/orthogroup-service';
import type { DiffEntriesState, OrthogroupDiffDocument, OrthogroupDiffPayload } from '@/types/orthogroup';

type Fetched = {
  storagePath: string;
  payload?: OrthogroupDiffPayload;
  error?: string;
};

/**
 * Resolve diff entries from either the Storage payload (new) or the legacy
 * `top[]` field on the Firestore doc. Cache key is `storagePath` — when the
 * doc's storagePath changes (new orthofinder/grouping version), a new fetch
 * is issued automatically.
 */
export function useOrthogroupDiffEntries(
  diffDoc: OrthogroupDiffDocument | null,
): DiffEntriesState {
  const storagePath = diffDoc?.storagePath ?? null;
  const legacyTop = diffDoc && !storagePath ? diffDoc.top ?? null : null;

  const [fetched, setFetched] = useState<Fetched | null>(null);

  useEffect(() => {
    if (!storagePath) return;
    const controller = new AbortController();
    fetchOrthogroupDiffPayload(storagePath, controller.signal)
      .then((payload) => {
        if (!controller.signal.aborted) setFetched({ storagePath, payload });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : 'Failed to load diff entries';
        setFetched({ storagePath, error: message });
      });
    return () => controller.abort();
  }, [storagePath]);

  if (!diffDoc) return { kind: 'idle' };
  if (!storagePath) {
    return legacyTop ? { kind: 'legacy', entries: legacyTop } : { kind: 'idle' };
  }
  if (fetched?.storagePath !== storagePath) {
    return { kind: 'loading', storagePath };
  }
  if (fetched.error) {
    return { kind: 'error', storagePath, message: fetched.error };
  }
  if (fetched.payload) {
    return { kind: 'ready', storagePath, payload: fetched.payload };
  }
  return { kind: 'loading', storagePath };
}

import { useEffect, useState } from 'react';
import { fetchOrthogroupDiffPayload } from '@/lib/orthogroup-service';
import type { DiffEntriesState, OrthogroupDiffDocument } from '@/types/orthogroup';

/**
 * Resolve diff entries from either the Storage payload (new) or the legacy
 * `top[]` field on the Firestore doc. Cache key is `storagePath` — when the
 * doc's storagePath changes (new orthofinder/grouping version), a new fetch
 * is issued automatically.
 */
export function useOrthogroupDiffEntries(
  diffDoc: OrthogroupDiffDocument | null,
): DiffEntriesState {
  const [state, setState] = useState<DiffEntriesState>({ kind: 'idle' });

  const storagePath = diffDoc?.storagePath ?? null;
  const legacyTop = diffDoc && !storagePath ? diffDoc.top ?? null : null;

  useEffect(() => {
    if (!diffDoc) {
      setState({ kind: 'idle' });
      return;
    }
    if (!storagePath) {
      if (legacyTop && legacyTop.length >= 0) {
        setState({ kind: 'legacy', entries: legacyTop });
      } else {
        setState({ kind: 'idle' });
      }
      return;
    }

    const controller = new AbortController();
    setState({ kind: 'loading', storagePath });

    fetchOrthogroupDiffPayload(storagePath, controller.signal)
      .then((payload) => {
        if (controller.signal.aborted) return;
        setState({ kind: 'ready', storagePath, payload });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : 'Failed to load diff entries';
        setState({ kind: 'error', storagePath, message });
      });

    return () => controller.abort();
  }, [diffDoc, storagePath, legacyTop]);

  return state;
}

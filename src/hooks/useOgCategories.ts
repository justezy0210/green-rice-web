import { useEffect, useState } from 'react';
import { fetchOgCategories, type OgCategoriesData } from '@/lib/orthogroup-service';

type State = { key: number; data: OgCategoriesData | null };
const EMPTY_STATE: State = { key: 0, data: null };

/**
 * Fetch precomputed LLM categories for the given orthofinder version.
 * Returns null while loading or if the file doesn't exist (regex fallback).
 */
export function useOgCategories(orthofinderVersion: number | null): OgCategoriesData | null {
  const key = orthofinderVersion && orthofinderVersion > 0 ? orthofinderVersion : 0;
  const [state, setState] = useState<State>(EMPTY_STATE);

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    fetchOgCategories(key, controller.signal).then((result) => {
      if (!controller.signal.aborted) setState({ key, data: result });
    });
    return () => controller.abort();
  }, [key]);

  return state.key === key ? state.data : null;
}

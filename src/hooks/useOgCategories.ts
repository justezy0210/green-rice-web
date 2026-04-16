import { useEffect, useState } from 'react';
import { fetchOgCategories, type OgCategoriesData } from '@/lib/orthogroup-service';

/**
 * Fetch precomputed LLM categories for the given orthofinder version.
 * Returns null while loading or if the file doesn't exist (regex fallback).
 */
export function useOgCategories(orthofinderVersion: number | null): OgCategoriesData | null {
  const [data, setData] = useState<OgCategoriesData | null>(null);

  useEffect(() => {
    if (!orthofinderVersion || orthofinderVersion <= 0) {
      setData(null);
      return;
    }
    const controller = new AbortController();
    fetchOgCategories(orthofinderVersion, controller.signal).then((result) => {
      if (!controller.signal.aborted) setData(result);
    });
    return () => controller.abort();
  }, [orthofinderVersion]);

  return data;
}

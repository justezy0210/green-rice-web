import { publicDownloadUrl } from '@/lib/download-urls';
import { geneSvIndexPath } from '@/lib/storage-paths';
import type { GeneSvIndex } from '@/types/gene-sv-index';

const _cache = new Map<string, GeneSvIndex>();
const _inflight = new Map<string, Promise<GeneSvIndex | null>>();

function cacheKey(orthofinderVersion: number, svReleaseId: string): string {
  return `v${orthofinderVersion}_r${svReleaseId}`;
}

export async function fetchGeneSvIndex(
  orthofinderVersion: number,
  svReleaseId: string,
): Promise<GeneSvIndex | null> {
  const key = cacheKey(orthofinderVersion, svReleaseId);
  const cached = _cache.get(key);
  if (cached) return cached;
  let p = _inflight.get(key);
  if (!p) {
    p = (async () => {
      try {
        const path = geneSvIndexPath(orthofinderVersion, svReleaseId);
        const res = await fetch(publicDownloadUrl(path));
        if (!res.ok) return null;
        const data = (await res.json()) as GeneSvIndex;
        _cache.set(key, data);
        return data;
      } finally {
        _inflight.delete(key);
      }
    })();
    _inflight.set(key, p);
  }
  return p;
}

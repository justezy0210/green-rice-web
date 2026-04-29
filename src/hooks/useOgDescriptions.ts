import { useEffect, useMemo, useState } from 'react';
import { publicDownloadUrl } from '@/lib/download-urls';
import { orthofinderOgDescriptionsPath } from '@/lib/storage-paths';

interface OgDescriptionRecord {
  transcripts?: string[];
  descriptions?: Record<string, string>;
}

type OgDescriptions = Record<string, OgDescriptionRecord>;

const _cache = new Map<number, OgDescriptions>();
const _inflight = new Map<number, Promise<OgDescriptions | null>>();

async function fetchOgDescriptions(version: number): Promise<OgDescriptions | null> {
  const cached = _cache.get(version);
  if (cached) return cached;
  let p = _inflight.get(version);
  if (!p) {
    p = (async () => {
      try {
        const res = await fetch(publicDownloadUrl(orthofinderOgDescriptionsPath(version)));
        if (!res.ok) return null;
        const data = (await res.json()) as OgDescriptions;
        _cache.set(version, data);
        return data;
      } finally {
        _inflight.delete(version);
      }
    })();
    _inflight.set(version, p);
  }
  return p;
}

export function useOgDescriptions(
  version: number | null,
  enabled: boolean,
): {
  descriptions: OgDescriptions | null;
  loading: boolean;
  available: boolean;
} {
  const key = version && enabled ? `v${version}` : '';
  const [state, setState] = useState<{
    key: string;
    descriptions: OgDescriptions | null;
  }>({ key: '', descriptions: null });

  useEffect(() => {
    if (!key || !version) return;
    let cancelled = false;
    fetchOgDescriptions(version).then((descriptions) => {
      if (!cancelled) setState({ key, descriptions });
    });
    return () => {
      cancelled = true;
    };
  }, [key, version]);

  const isCurrent = state.key === key;
  return {
    descriptions: isCurrent ? state.descriptions : null,
    loading: Boolean(key) && !isCurrent,
    available: Boolean(isCurrent && state.descriptions),
  };
}

export function useOgDescriptionMatches(
  descriptions: OgDescriptions | null,
  query: string,
): Map<string, string> {
  return useMemo(() => {
    const matches = new Map<string, string>();
    const needle = query.trim().toLowerCase();
    if (!descriptions || needle.length < 2) return matches;

    for (const [ogId, record] of Object.entries(descriptions)) {
      const transcripts = record.transcripts ?? [];
      const transcriptHit = transcripts.find((id) => id.toLowerCase().includes(needle));
      if (transcriptHit) {
        matches.set(ogId, transcriptHit);
        continue;
      }

      const values = Object.values(record.descriptions ?? {});
      const descriptionHit = values.find(
        (desc) => desc && desc !== 'NA' && desc.toLowerCase().includes(needle),
      );
      if (descriptionHit) matches.set(ogId, descriptionHit.replaceAll('%2C', ','));
    }

    return matches;
  }, [descriptions, query]);
}

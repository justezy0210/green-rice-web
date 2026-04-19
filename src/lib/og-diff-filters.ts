import type { OrthogroupDiffEntry, OgAlleleFreqPayload } from '@/types/orthogroup';
import type { DiffEntriesState } from '@/types/orthogroup';

export type DiffSortKey = 'p' | 'meanDiff' | 'log2FC' | 'deltaAf';

export function extractEntries(state: DiffEntriesState): OrthogroupDiffEntry[] {
  if (state.kind === 'ready') return state.payload.entries;
  if (state.kind === 'legacy') return state.entries;
  return [];
}

/** Case-insensitive match across OG id, IRGSP transcript ids, and description text. */
export function filterByQuery(
  entries: OrthogroupDiffEntry[],
  query: string,
): OrthogroupDiffEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter((e) => {
    if (e.orthogroup.toLowerCase().includes(q)) return true;
    const rep = e.representative;
    if (!rep) return false;
    if (rep.transcripts?.some((t) => t.toLowerCase().includes(q))) return true;
    if (rep.descriptions) {
      for (const desc of Object.values(rep.descriptions)) {
        if (desc && desc.toLowerCase().includes(q)) return true;
      }
    }
    return false;
  });
}

export function sortEntries(
  entries: OrthogroupDiffEntry[],
  key: DiffSortKey,
  alleleFreq?: OgAlleleFreqPayload | null,
): OrthogroupDiffEntry[] {
  const copy = entries.slice();
  if (key === 'p') {
    copy.sort((a, b) => (a.pValue - b.pValue) || (b.meanDiff - a.meanDiff));
    return copy;
  }
  if (key === 'meanDiff') {
    copy.sort((a, b) => (b.meanDiff - a.meanDiff) || (a.pValue - b.pValue));
    return copy;
  }
  if (key === 'deltaAf') {
    const maxDeltaAf = (ogId: string): number => {
      const variants = alleleFreq?.ogs[ogId]?.variants;
      if (!variants || variants.length === 0) return -1;
      return variants[0].deltaAf; // already sorted desc
    };
    copy.sort((a, b) => {
      const da = maxDeltaAf(a.orthogroup);
      const db = maxDeltaAf(b.orthogroup);
      if (da !== db) return db - da; // higher first; -1 (no data) goes last
      return a.pValue - b.pValue;
    });
    return copy;
  }
  // log2FC: null goes last, otherwise sort by absolute magnitude descending
  copy.sort((a, b) => {
    const av = a.log2FoldChange;
    const bv = b.log2FoldChange;
    if (av === null && bv === null) return a.pValue - b.pValue;
    if (av === null) return 1;
    if (bv === null) return -1;
    return Math.abs(bv) - Math.abs(av);
  });
  return copy;
}

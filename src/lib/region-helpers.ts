import type { GeneModelEntry } from '@/types/gene-model';

export function parseRange(range: string | undefined): [number, number] | null {
  if (!range) return null;
  const m = range.match(/^(\d+)-(\d+)$/);
  if (!m) return null;
  const s = parseInt(m[1], 10);
  const e = parseInt(m[2], 10);
  if (!Number.isFinite(s) || !Number.isFinite(e) || s > e) return null;
  return [s, e];
}

export function cultivarPrefix(cultivar: string): string {
  return cultivar.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase();
}

export function rangeOverlaps(
  aS: number,
  aE: number,
  bS: number,
  bE: number,
): boolean {
  return aS <= bE && aE >= bS;
}

/**
 * Case-insensitive substring match across every functional-annotation
 * field on a gene model entry. Used by the Region page's filter box.
 */
export function geneMatchesFunction(
  g: GeneModelEntry & { id: string },
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const a = g.annotation;
  if (!a) return g.id.toLowerCase().includes(q);
  const haystack: string[] = [g.id];
  if (a.product) haystack.push(a.product);
  if (a.cog) haystack.push(a.cog);
  if (a.eggnog) haystack.push(a.eggnog);
  if (a.pfam) haystack.push(...a.pfam);
  if (a.interpro) haystack.push(...a.interpro);
  if (a.go) haystack.push(...a.go);
  return haystack.some((s) => s.toLowerCase().includes(q));
}

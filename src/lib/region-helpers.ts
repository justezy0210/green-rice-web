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
 * One-shot pre-computed lowercase string covering every field the
 * Region page's filter box searches: gene id, product description,
 * Pfam, InterPro, GO, COG, eggNOG. Generated once per gene when
 * `overlappingGenes` is built so the per-keystroke filter is a single
 * `String.prototype.includes` call instead of repeated `toLowerCase`
 * + array spreading per keystroke × per gene.
 */
export function geneSearchText(g: GeneModelEntry & { id: string }): string {
  const parts: string[] = [g.id];
  const a = g.annotation;
  if (a) {
    if (a.product) parts.push(a.product);
    if (a.cog) parts.push(a.cog);
    if (a.eggnog) parts.push(a.eggnog);
    if (a.pfam) parts.push(...a.pfam);
    if (a.interpro) parts.push(...a.interpro);
    if (a.go) parts.push(...a.go);
  }
  return parts.join(' ').toLowerCase();
}

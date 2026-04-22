import type {
  GeneModelEntry,
  GeneModelPartition,
} from '@/types/gene-model';
import type { GeneIndexPartition } from '@/types/gene-index';

export interface RegionGene extends GeneModelEntry {
  id: string;
  ogId: string | null;
  searchText: string;
}

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
export function geneSearchText(
  g: GeneModelEntry & { id: string },
  ogId: string | null,
): string {
  const parts: string[] = [g.id];
  if (ogId) parts.push(ogId);
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

/** Scan the loaded partition for genes that hit the (cultivar, chr, start-end) window. */
export function computeOverlappingGenes(args: {
  partition: GeneModelPartition | null;
  indexPartition: GeneIndexPartition | null;
  cultivar: string | null;
  chr: string | null;
  start: number;
  end: number;
  rangeValid: boolean;
}): RegionGene[] {
  const { partition, indexPartition, cultivar, chr, start, end, rangeValid } = args;
  if (!partition || !rangeValid || !cultivar || !chr) return [];
  const hits: RegionGene[] = [];
  for (const id in partition.genes) {
    const g = partition.genes[id];
    if (g.cultivar !== cultivar) continue;
    if (g.chr !== chr) continue;
    if (!rangeOverlaps(g.start, g.end, start, end)) continue;
    // gene_index keys are transcript-level; try the primary transcript
    // id first, then the bare gene id for the rare cases where the
    // model already carries a stripped id.
    const transcriptId = g.transcript?.id ?? id;
    const ogId =
      indexPartition?.entries[transcriptId]?.og ??
      indexPartition?.entries[id]?.og ??
      null;
    hits.push({ id, ogId, ...g, searchText: geneSearchText({ id, ...g }, ogId) });
  }
  hits.sort((a, b) => a.start - b.start);
  return hits;
}


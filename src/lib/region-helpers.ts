import type {
  GeneModelEntry,
  GeneModelPartition,
} from '@/types/gene-model';
import type { GeneIndexPartition } from '@/types/gene-index';
import type { SvEvent, SvType } from '@/types/sv-event';

export interface RegionGene extends GeneModelEntry {
  id: string;
  ogId: string | null;
  searchText: string;
}

export interface RegionBin {
  i: number;
  binStart: number;
  binEnd: number;
  geneCount: number;
  ogAssignedCount: number;
  /** Genes in this bin that belong to the caller's focused OG (via `?og=`). */
  focusedOgCount: number;
  svCount: Record<SvType, number>;
  svTotal: number;
  /**
   * Largest SV `scaleBp` observed in this bin. `scaleBp` is
   * `svLenAbs` for INS/DEL and `max(refLen, altLen)` for COMPLEX —
   * the latter keeps inversions (near-zero `svLenAbs`, real spatial
   * footprint) from disappearing from the size channel.
   */
  maxEventScaleBp: number;
}

function svEventScaleBp(ev: SvEvent): number {
  if (ev.svType === 'COMPLEX') return Math.max(ev.refLen, ev.altLen);
  return ev.svLenAbs;
}

/** Human-readable size formatter for tooltips and status rows. */
export function formatBp(bp: number): string {
  if (bp >= 1_000_000) return `${(bp / 1_000_000).toFixed(1)} Mb`;
  if (bp >= 1_000) return `${Math.round(bp / 1_000)} kb`;
  return `${bp} bp`;
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

function rangeOverlaps(
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
function geneSearchText(
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

/**
 * Every gene on a single chromosome for the given cultivar — the
 * chr-wide companion to `computeOverlappingGenes`. Used by the
 * chromosome overview thumbnail so it can plot full-chr gene
 * density without re-doing the window filter.
 */
export function computeChrGenes(args: {
  partition: GeneModelPartition | null;
  indexPartition: GeneIndexPartition | null;
  cultivar: string | null;
  chr: string | null;
}): RegionGene[] {
  const { partition, indexPartition, cultivar, chr } = args;
  if (!partition || !cultivar || !chr) return [];
  const hits: RegionGene[] = [];
  for (const id in partition.genes) {
    const g = partition.genes[id];
    if (g.cultivar !== cultivar || g.chr !== chr) continue;
    const tid = g.transcript?.id ?? id;
    const ogId =
      indexPartition?.entries[tid]?.og ??
      indexPartition?.entries[id]?.og ??
      null;
    hits.push({ id, ogId, ...g, searchText: '' });
  }
  return hits;
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

/**
 * Adaptive summary mode. Histogram each gene (by midpoint) and each
 * SV event (by pos) into equal-width bins so the track renders O(bins)
 * elements at Mb scale instead of O(genes+svs). Height encoding at the
 * call site should use sqrt(count) so a single hotspot bin does not
 * flatten the rest.
 */
export function buildRegionBins(
  start: number,
  end: number,
  genes: RegionGene[],
  svEvents: SvEvent[],
  binCount: number,
  focusedOgId: string | null = null,
): RegionBin[] {
  const span = Math.max(1, end - start);
  const binSize = span / binCount;
  const bins: RegionBin[] = [];
  for (let i = 0; i < binCount; i++) {
    bins.push({
      i,
      binStart: start + i * binSize,
      binEnd: start + (i + 1) * binSize,
      geneCount: 0,
      ogAssignedCount: 0,
      focusedOgCount: 0,
      svCount: { INS: 0, DEL: 0, COMPLEX: 0 },
      svTotal: 0,
      maxEventScaleBp: 0,
    });
  }
  for (const g of genes) {
    const mid = (g.start + g.end) / 2;
    let idx = Math.floor((mid - start) / binSize);
    if (idx < 0) idx = 0;
    if (idx >= binCount) idx = binCount - 1;
    bins[idx].geneCount++;
    if (g.ogId) bins[idx].ogAssignedCount++;
    if (focusedOgId && g.ogId === focusedOgId) bins[idx].focusedOgCount++;
  }
  for (const ev of svEvents) {
    const idx = Math.floor((ev.pos - start) / binSize);
    if (idx < 0 || idx >= binCount) continue;
    bins[idx].svCount[ev.svType] = (bins[idx].svCount[ev.svType] ?? 0) + 1;
    bins[idx].svTotal++;
    const scale = svEventScaleBp(ev);
    if (scale > bins[idx].maxEventScaleBp) bins[idx].maxEventScaleBp = scale;
  }
  return bins;
}


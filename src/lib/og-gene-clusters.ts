import { IRGSP_DISPLAY_NAME } from '@/lib/irgsp-constants';
import type {
  OgGeneCoords,
  GeneCluster,
  CultivarGeneCoord,
  OrthogroupRepresentative,
  OgVariantSummary,
} from '@/types/orthogroup';
import type { CultivarGroupAssignment } from '@/types/grouping';

export const IRGSP_CULTIVAR = IRGSP_DISPLAY_NAME;
export const IRGSP_CLUSTER_PREFIX = 'irgsp_';

const DEFAULT_THRESHOLD = 25_000; // 25kb — subject to pilot tuning

/**
 * Group cultivar genes into clusters by chromosome + proximity.
 * - Same cultivar + same chromosome + within `threshold` bp → same cluster
 * - Different chromosome or > threshold → separate cluster
 * - Single-gene clusters are marked 'singleton'
 * - Multi-gene clusters on the same chromosome → 'tandem'
 * - If a cultivar has clusters on multiple chromosomes, each is 'dispersed'
 */
export function buildGeneClusters(
  coords: OgGeneCoords,
  threshold: number = DEFAULT_THRESHOLD,
): GeneCluster[] {
  const clusters: GeneCluster[] = [];

  for (const [cultivar, genes] of Object.entries(coords)) {
    if (!genes || genes.length === 0) continue;

    // Group by chromosome
    const byChr = new Map<string, CultivarGeneCoord[]>();
    for (const g of genes) {
      if (!byChr.has(g.chr)) byChr.set(g.chr, []);
      byChr.get(g.chr)!.push(g);
    }

    const chrCount = byChr.size;

    for (const [chr, chrGenes] of byChr.entries()) {
      chrGenes.sort((a, b) => a.start - b.start);
      let cur: CultivarGeneCoord[] = [chrGenes[0]];
      for (let i = 1; i < chrGenes.length; i++) {
        const g = chrGenes[i];
        const last = cur[cur.length - 1];
        if (g.start - last.end <= threshold) {
          cur.push(g);
        } else {
          clusters.push(makeCluster(cultivar, chr, cur, chrCount));
          cur = [g];
        }
      }
      clusters.push(makeCluster(cultivar, chr, cur, chrCount));
    }
  }

  // Sort: by cultivar, then chr, then start
  clusters.sort((a, b) => {
    if (a.cultivar !== b.cultivar) return a.cultivar.localeCompare(b.cultivar);
    if (a.chr !== b.chr) return a.chr.localeCompare(b.chr);
    return a.start - b.start;
  });
  return clusters;
}

function makeCluster(
  cultivar: string,
  chr: string,
  genes: CultivarGeneCoord[],
  chrCount: number,
): GeneCluster {
  const start = Math.min(...genes.map((g) => g.start));
  const end = Math.max(...genes.map((g) => g.end));
  let kind: GeneCluster['kind'];
  if (genes.length === 1) {
    kind = chrCount > 1 ? 'dispersed' : 'singleton';
  } else {
    kind = 'tandem';
  }
  return {
    id: `${cultivar}_${chr}_${start}`,
    cultivar,
    chr,
    start,
    end,
    genes,
    kind,
    source: 'cultivar',
  };
}

/**
 * Build a "reference pseudo-cluster" from OG representative + AF geneRegions.
 * Pseudo: consumes OG-level data instead of the per-cluster og_region pipeline.
 * Represents the IRGSP locus itself, not a cultivar-anchored cluster.
 */
export function buildReferenceCluster(
  representative: OrthogroupRepresentative | null | undefined,
  afSummary: OgVariantSummary | null | undefined,
): GeneCluster | null {
  if (!representative || !representative.transcripts.length) return null;
  const regions = afSummary?.geneRegions ?? [];
  if (regions.length === 0) return null;

  const chr = regions[0].chr;
  const start = Math.min(...regions.map((r) => r.start));
  const end = Math.max(...regions.map((r) => r.end));

  const genes: CultivarGeneCoord[] = regions.map((r) => ({
    id: r.geneId,
    chr: r.chr,
    start: r.start,
    end: r.end,
    strand: '+',
  }));

  return {
    id: `${IRGSP_CLUSTER_PREFIX}${chr}_${start}`,
    cultivar: IRGSP_CULTIVAR,
    chr,
    start,
    end,
    genes,
    kind: genes.length > 1 ? 'tandem' : 'singleton',
    source: 'reference',
  };
}

export interface PresenceCount {
  present: number;
  total: number;
}

/**
 * For a given cluster, compute the fraction of each phenotype group that has at
 * least one annotated OG member on the cluster's chromosome.
 *
 * Scope: "annotated OG-member presence", not "locus presence". Annotation
 * splits / paralog merge in OrthoFinder will shift this count. UI wording must
 * respect that.
 */
export function computeGroupPresenceForCluster(
  cluster: GeneCluster,
  coords: OgGeneCoords | null,
  groupByCultivar: Record<string, CultivarGroupAssignment> | null | undefined,
  groupLabels: string[],
): Record<string, PresenceCount> {
  const result: Record<string, PresenceCount> = {};
  for (const lbl of groupLabels) result[lbl] = { present: 0, total: 0 };

  if (!coords || !groupByCultivar || groupLabels.length === 0) return result;

  // Totals per group = cultivars assigned to the group in grouping doc.
  const cultivarsByGroup = new Map<string, string[]>();
  for (const [cultivar, assignment] of Object.entries(groupByCultivar)) {
    const lbl = assignment.groupLabel;
    if (!lbl || !result[lbl]) continue;
    if (!cultivarsByGroup.has(lbl)) cultivarsByGroup.set(lbl, []);
    cultivarsByGroup.get(lbl)!.push(cultivar);
    result[lbl].total += 1;
  }

  // Presence per cultivar = has ≥ 1 gene on cluster.chr.
  // Cluster source is 'cultivar'; for 'reference' we skip (meaningless).
  if (cluster.source !== 'cultivar') return result;

  for (const [lbl, cultivars] of cultivarsByGroup.entries()) {
    for (const cultivar of cultivars) {
      const genes = coords[cultivar];
      if (!genes) continue;
      const hit = genes.some((g) => g.chr === cluster.chr);
      if (hit) result[lbl].present += 1;
    }
  }

  return result;
}

export function formatClusterSummary(cluster: GeneCluster): string {
  const mb = (n: number) => (n / 1_000_000).toFixed(3);
  if (cluster.genes.length === 1) {
    return `${cluster.chr}: ${mb(cluster.start)}M`;
  }
  return `${cluster.chr}: ${mb(cluster.start)}-${mb(cluster.end)}M (${cluster.genes.length} genes, ${cluster.kind})`;
}

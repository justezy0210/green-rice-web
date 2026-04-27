import type { ImpactClass } from '@/types/intersection';

const IMPACT_WEIGHT: Record<ImpactClass, number> = {
  coding_or_splice: 1,
  utr: 0.9,
  intron: 0.75,
  promoter_2kb: 0.7,
  upstream_2_10kb: 0.45,
  downstream_2kb: 0.45,
  intergenic: 0.25,
  gene_body: 0.75,
  cds_disruption: 1,
  promoter: 0.7,
  upstream: 0.45,
  cluster_enclosure: 0.45,
  cnv_support: 0.45,
  inversion_boundary: 0.45,
  te_associated: 0.45,
};

export function impactClassWeight(impactClass: ImpactClass | null): number {
  if (!impactClass) return 0.5;
  return IMPACT_WEIGHT[impactClass] ?? 0.5;
}

export function impactWeightedSvScore(
  spread: number | null,
  impactClass: ImpactClass | null,
): number | null {
  if (spread === null) return null;
  return Number((spread * impactClassWeight(impactClass)).toFixed(4));
}


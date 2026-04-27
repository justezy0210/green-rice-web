import type { ImpactClass } from '@/types/intersection';

const IMPACT_LABEL: Record<ImpactClass, string> = {
  coding_or_splice: 'CDS/splice',
  utr: 'UTR',
  intron: 'intron',
  promoter_2kb: 'promoter 2 kb',
  upstream_2_10kb: 'upstream 2-10 kb',
  downstream_2kb: 'downstream 2 kb',
  intergenic: 'intergenic',
  gene_body: 'gene body (legacy)',
  cds_disruption: 'CDS (legacy)',
  promoter: 'promoter (legacy)',
  upstream: 'upstream (legacy)',
  cluster_enclosure: 'cluster context (legacy)',
  cnv_support: 'CNV context (legacy)',
  inversion_boundary: 'inversion boundary (legacy)',
  te_associated: 'TE context (legacy)',
};

export function impactClassLabel(impactClass: ImpactClass): string {
  return IMPACT_LABEL[impactClass] ?? impactClass;
}


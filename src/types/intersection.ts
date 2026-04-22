import type { TraitId } from '@/types/traits';
import type { RunId } from '@/types/analysis-run';

export type ImpactClass =
  | 'gene_body'
  | 'cds_disruption'
  | 'promoter'
  | 'upstream'
  | 'cluster_enclosure'
  | 'cnv_support'
  | 'inversion_boundary'
  | 'te_associated';

export type SvType = 'INS' | 'DEL' | 'COMPLEX';

export interface IntersectionRow {
  ogId: string;
  eventId: string;
  impactClass: ImpactClass;
  cultivar: string;
  geneId: string | null;
  chr: string;
  start: number;
  end: number;
  svType: SvType;
  absDeltaAf: number;
  traitId: TraitId;
}

/** OG-scoped aggregation across runs for the OG detail page. */
export interface OgIntersectionBundle {
  schemaVersion: number;
  intersectionReleaseId: string;
  ogId: string;
  runs: Array<{
    runId: RunId;
    traitId: TraitId;
    rows: IntersectionRow[];
  }>;
  createdAt: string;
}

export interface IntersectionRelease {
  intersectionReleaseId: string;
  svReleaseId: string;
  geneModelVersion: number;
  promoterWindowBp: number;
  enclosurePolicy: 'gene_body' | 'cluster_span' | 'synteny_block';
  rowCount: number;
  status: 'building' | 'ready' | 'error';
  createdAt: string;
}

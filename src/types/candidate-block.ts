import type { TraitId } from '@/types/traits';
import type { RunId } from '@/types/analysis-run';
import type { ImpactClass, SvType } from '@/types/intersection';

/**
 * Block-type categorical badge (UI only — explanatory label, not a
 * biological ontology). `shared_linked_block` replaces the earlier
 * `shared_haplotype_block` naming; block boundaries never claim an
 * inferred haplotype (see design-doc §Terminology caveat).
 */
export type BlockType =
  | 'og_sv_block'
  | 'sv_regulatory_block'
  | 'cnv_block'
  | 'shared_linked_block';

export type BlockEvidenceStatus =
  | 'ready'
  | 'partial'
  | 'pending'
  | 'external_future';

export interface BlockEvidenceStatusMap {
  groupSpecificity: BlockEvidenceStatus;
  svImpact: BlockEvidenceStatus;
  ogPattern: BlockEvidenceStatus;
  function: BlockEvidenceStatus;
  expression: BlockEvidenceStatus;
  qtl: BlockEvidenceStatus;
}

export interface BlockRegion {
  chr: string;
  start: number;
  end: number;
}

export interface BlockLeadSv {
  eventId: string;
  svType: SvType;
  chr: string;
  start: number;
  end: number;
  impactClass: ImpactClass | null;
  cultivar: string | null;
  geneId: string | null;
  absDeltaAf: number | null;
  nearBoundary: boolean;
}

export interface BlockLeadOg {
  ogId: string;
  copyDiff: number | null;
  pValue: number | null;
  log2FoldChange: number | null;
  presenceByGroup: Record<string, number>;
  representativeAnnotation: string | null;
  familyTag: string | null; // e.g. 'NLR', 'WAK', 'NBS-LRR'
}

export interface CandidateBlock {
  blockId: string;
  runId: RunId;
  traitId: TraitId;

  region: BlockRegion;
  groupLabels: [string, string];
  groupCounts: Record<string, number>;

  blockType: BlockType;
  curated: boolean;
  curationNote: string | null;
  summaryMarkdown: string | null;

  // Observations
  svCount: number;
  candidateOgCount: number;
  intersectionCount: number;
  dominantSvType: SvType | 'mixed' | null;
  blockSpecificityGap: number | null;
  representativeAnnotations: string[];
  repeatedFamilyFlag: boolean;

  leadSvs: BlockLeadSv[];
  leadOgs: BlockLeadOg[];

  // Narrative + uncertainty
  interpretationSummary: string | null;
  evidenceStatus: BlockEvidenceStatusMap;
  caveats: string[];

  // Cross-links
  sharedWithRuns: RunId[]; // other runs that have a block at this region
  neighborBlockIds: string[]; // adjacent 1 Mb bins
  blockSetVersion: number;
  intersectionReleaseId: string;

  // Convenience aggregates emitted by the promote script
  topOgIds: string[];
  topSvs: Array<{ eventId: string; count: number }>;
  candidateTypeCounts: Record<string, number>;

  createdAt: string;
}


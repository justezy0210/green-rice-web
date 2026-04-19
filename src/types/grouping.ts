/**
 * Canonical types for the auto-grouping pipeline.
 * Python mirror: functions-python/grouping/models.py (must stay in sync).
 */

export type PhenotypeFieldKey =
  | 'early'
  | 'normal'
  | 'late'
  | 'culmLength'
  | 'panicleLength'
  | 'panicleNumber'
  | 'spikeletsPerPanicle'
  | 'ripeningRate'
  | 'grainWeight1000'
  | 'preHarvestSprouting'
  | 'bacterialLeafBlight';

export type { TraitId } from '@/types/traits';
import type { TraitId } from '@/types/traits';

export interface TraitMetadata {
  traitId: TraitId;
  type: 'multi-env' | 'single-continuous' | 'binary';
  keys: string[];
  direction: 'higher-is-more' | 'higher-is-less' | 'not-applicable';
  labels: { low: string; high: string };
  unit: string;
}

export interface GroupingSummary {
  traitId: TraitId;
  method: 'gmm' | 'fixed-class' | 'none';
  nGroups: number;
  scoreMetric: 'silhouette' | 'bic' | 'none';
  scoreValue: number;
  version: number;
  updatedAt: string;
}

export interface CultivarGroupAssignment {
  groupLabel: string;
  probability: number;
  confidence: 'high' | 'medium' | 'borderline';
  borderline: boolean;
  indexScore: number;
}

export interface TraitQuality {
  traitId: TraitId;
  nObserved: number;
  nUsedInModel: number;
  missingRate: number;
  usable: boolean;
  note: string;
}

export interface GroupingDocument {
  summary: GroupingSummary;
  quality: TraitQuality;
  assignments: Record<string, CultivarGroupAssignment>;
}

export interface GroupingMeta {
  status: 'idle' | 'running';
  leaseExpiresAt: string | null;
  completedAt: string;
  version: number;
  phenotypeHash: string;
}

export const FIELD_TO_TRAIT_ID: Record<PhenotypeFieldKey, TraitId> = {
  early: 'heading_date',
  normal: 'heading_date',
  late: 'heading_date',
  culmLength: 'culm_length',
  panicleLength: 'panicle_length',
  panicleNumber: 'panicle_number',
  spikeletsPerPanicle: 'spikelets_per_panicle',
  ripeningRate: 'ripening_rate',
  grainWeight1000: 'grain_weight',
  preHarvestSprouting: 'pre_harvest_sprouting',
  bacterialLeafBlight: 'bacterial_leaf_blight',
};

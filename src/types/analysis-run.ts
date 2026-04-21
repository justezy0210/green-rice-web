import type { TraitId } from '@/types/traits';

export type AnalysisStepKey =
  | 'phenotype'
  | 'orthogroups'
  | 'variants'
  | 'intersections'
  | 'candidates';

export type AnalysisStepStatus =
  | 'ready'
  | 'pending'
  | 'disabled'
  | 'error';

export interface RunIdParts {
  traitId: TraitId;
  groupingVersion: number;
  orthofinderVersion: number;
  svReleaseVersion: number;
  geneModelVersion: number;
  scoringVersion: number;
}

export type RunId = string;

export interface AnalysisRun {
  runId: RunId;
  traitId: TraitId;
  groupingVersion: number;
  orthofinderVersion: number;
  svReleaseId: string | null;
  intersectionReleaseId: string | null;
  geneModelVersion: number;
  scoringVersion: number;
  sampleSetVersion: string;
  sampleCount: number;
  status: 'building' | 'ready' | 'stale' | 'error';
  stepAvailability: Record<AnalysisStepKey, AnalysisStepStatus>;
  candidateCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SvRelease {
  svReleaseId: string;
  normalizationMethod: string;
  sourceVcf: string;
  sampleSet: string[];
  eventCount: number;
  chunkManifestPath: string;
  status: 'building' | 'ready' | 'error';
  createdAt: string;
}

export interface IntersectionRelease {
  intersectionReleaseId: string;
  svReleaseId: string;
  geneModelVersion: number;
  promoterWindowBp: number;
  enclosurePolicy: 'gene_body' | 'cluster_span' | 'synteny_block';
  outputManifestPath: string;
  status: 'building' | 'ready' | 'error';
  createdAt: string;
}

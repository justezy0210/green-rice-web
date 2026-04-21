import type { TraitId } from '@/types/traits';
import type { RunId } from '@/types/analysis-run';

export type CandidateType =
  | 'og_only'
  | 'og_plus_sv'
  | 'sv_regulatory'
  | 'cnv_dosage'
  | 'haplotype_block';

export type CandidateEvidenceAxis =
  | 'group_specificity'
  | 'function'
  | 'og_pattern'
  | 'sv_impact'
  | 'synteny'
  | 'expression'
  | 'qtl';

export type CandidateAxisStatus =
  | 'ready'
  | 'pending'
  | 'partial'
  | 'external_future';

export interface CandidateAxisScore {
  axis: CandidateEvidenceAxis;
  status: CandidateAxisStatus;
  score: number | null;
  note: string | null;
}

export interface CandidateRegion {
  cultivar: string;
  chr: string;
  start: number;
  end: number;
}

export interface Candidate {
  candidateId: string;
  runId: RunId;
  traitId: TraitId;
  candidateType: CandidateType;
  primaryOgId: string | null;
  leadGeneId: string | null;
  leadRegion: CandidateRegion | null;
  leadSvId: string | null;
  rank: number;
  totalScore: number;
  scoreBreakdown: CandidateAxisScore[];
  groupSpecificitySummary: string | null;
  functionSummary: string | null;
  orthogroupPatternSummary: string | null;
  svImpactSummary: string | null;
  syntenySummary: string | null;
  expressionSummary: string | null;
  qtlSummary: string | null;
  badges: string[];
  storageBundlePath: string | null;
  createdAt: string;
}

export interface EntityAnalysisLink {
  runId: RunId;
  candidateId: string | null;
  traitId: TraitId;
  rank: number | null;
  totalScore: number | null;
  candidateType: CandidateType | null;
}

export type EntityType = 'gene' | 'og' | 'region' | 'sv';

export interface EntityAnalysisIndex {
  entityType: EntityType;
  entityId: string;
  linkedRuns: RunId[];
  topCandidates: EntityAnalysisLink[];
  latestUpdatedAt: string;
}

import type { TraitId } from '@/types/traits';
import type { RunId } from '@/types/analysis-run';
import type { ImpactClass, SvType } from '@/types/intersection';

export type CandidateType =
  | 'og_only'
  | 'og_plus_sv'
  | 'sv_regulatory'
  | 'cnv_dosage'
  | 'haplotype_block';

/**
 * Compact SV evidence attached to each candidate. Mirrors the
 * `best_sv_*` columns in the server-side step5 output.
 */
export interface CandidateBestSv {
  eventId: string;
  svType: SvType;
  chr: string;
  start: number;
  end: number;
  impactClass: ImpactClass | null;
  cultivar: string | null;
  geneId: string | null;
  absDeltaAf: number | null;
}

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
  /**
   * Full best-SV context from step5 of the server run, populated by
   * `scripts/promote-analysis-run.py`. `null` for og_only candidates
   * that have no SV-level evidence.
   */
  bestSv: CandidateBestSv | null;
  /**
   * Review-unit the candidate rolls up into, if any. Block IDs follow
   * `bin_{chr}_{start}_{end}` (auto) or `curated_{name}` (curated).
   */
  blockId: string | null;
  rank: number;
  /** Server step2 rank (OG-level MWU ranking, pre-SV). */
  baseRank: number | null;
  /** Normalised 3-axis score (Phase 2B-era). */
  baseScore: number | null;
  /**
   * Primary display score — 3-axis + SV-impact combined. Replaces
   * `totalScore` as the UI-level figure.
   */
  combinedScore: number | null;
  /** @deprecated prefer combinedScore; kept for legacy docs. */
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

export interface EntityBlockLink {
  runId: RunId;
  blockId: string;
  traitId: TraitId;
  chr: string;
  start: number;
  end: number;
  curated: boolean;
}

/**
 * `region` exact-string keys are deprecated in favour of coordinate
 * overlap lookup; promote scripts should stop writing them. Remaining
 * values stay readable so existing bookmarks do not 404.
 */
export type EntityType = 'gene' | 'og' | 'region' | 'sv';

export interface EntityAnalysisIndex {
  entityType: EntityType;
  entityId: string;
  linkedRuns: RunId[];
  topCandidates: EntityAnalysisLink[];
  /** Added 2026-04-22: blocks containing this entity across runs. */
  topBlocks: EntityBlockLink[];
  latestUpdatedAt: string;
}

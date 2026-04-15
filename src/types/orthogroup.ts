/**
 * Orthogroup differential analysis types.
 * Python mirror: functions-python/orthofinder/models.py (must stay in sync).
 */

import type { TraitId } from './grouping';

export interface OrthogroupRepresentative {
  source: 'baegilmi_gff3';  // TEMPORARY — replace with proper functional annotation later
  geneId: string;
  chromosome: string;
  start: number;
  end: number;
  strand: '+' | '-' | '.';
  attributes: Record<string, string>;  // raw GFF3 col-9 (Note, product, Description, Ontology_term, ...)
}

export interface OrthogroupDiffEntry {
  orthogroup: string;                          // e.g. "OG0001234"
  meansByGroup: Record<string, number>;        // groupLabel → mean copy count
  presenceByGroup: Record<string, number>;     // groupLabel → fraction with copy >= 1
  cultivarCountsByGroup: Record<string, number>;  // groupLabel → n contributing cultivars
  meanDiff: number;                            // max - min across groups
  presenceDiff: number;
  log2FoldChange: number | null;               // only meaningful for exactly 2 groups; null otherwise
  uStatistic: number;                          // Mann-Whitney U
  pValue: number;                              // raw two-sided p-value (nominal, used for filtering)
  qValue: number;                              // BH-adjusted across all tested OGs (rarely <0.05 at small n; shown for reference)
  representative?: OrthogroupRepresentative;
}

export type SelectionMode = 'strict' | 'relaxed' | 'top_n_fallback';

export interface OrthogroupDiffThresholds {
  pValue: number;                  // raw p-value cutoff applied (nominal, unadjusted)
  meanDiff: number;                // minimum absolute mean difference
}

export interface OrthogroupDiffDocument {
  traitId: TraitId;
  groupLabels: string[];           // order matches group index score ascending
  top: OrthogroupDiffEntry[];      // filtered candidates, max 200
  selectionMode: SelectionMode;
  thresholds: OrthogroupDiffThresholds;
  totalTested: number;             // total OGs that were statistically tested
  passedCount: number;             // count passing the selection filter
  computedAt: string;
  groupingVersion: number;         // from _grouping_meta/lock.version
  orthofinderVersion: number;      // from _orthofinder_meta/state.activeVersion
}

export type OrthofinderStatus = 'idle' | 'uploading' | 'processing' | 'complete' | 'error';

export interface OrthofinderState {
  status: OrthofinderStatus;
  errorMessage?: string;
  activeVersion: number;             // 0 until first upload commits
  activeVersionUploadedAt: string | null;
  totalOrthogroups: number;
  cultivarIds: string[];
  geneCountPath: string;             // "orthofinder/v{N}/Orthogroups.GeneCount.tsv"
  genesPath: string;                 // "orthofinder/v{N}/Orthogroups.tsv"
  matrixJsonPath: string;            // "orthofinder/v{N}/_matrix.json"
}

export interface OrthofinderLock {
  status: 'idle' | 'running';
  leaseExpiresAt: string | null;
  version: number;                   // monotonic across all runs
}

export interface OrthogroupMatrixData {
  version: number;
  cultivarIds: string[];
  totalOrthogroups: number;
  ogs: Record<string, Record<string, number>>;  // ogId → cultivarId → copy count
}

/**
 * Orthogroup differential analysis types.
 * Python mirror: functions-python/orthofinder/models.py (must stay in sync).
 */

import type { TraitId } from './grouping';

export interface OrthogroupRepresentative {
  source: 'irgsp';
  /** IRGSP-1.0 transcript ids, e.g. ["Os01t0391600-00", ...] */
  transcripts: string[];
  /** transcript_id → description text. May contain "NA" for unannotated transcripts. */
  descriptions: Record<string, string>;
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

export const DIFF_SCHEMA_VERSION = 1;

/**
 * Firestore-side metadata. Full entries live in the Storage payload at `storagePath`.
 * Older documents written before the Storage split may still carry a `top[]` field —
 * frontend treats that as a legacy fallback source.
 */
export interface OrthogroupDiffDocument {
  traitId: TraitId;
  groupLabels: string[];           // order matches group index score ascending
  selectionMode: SelectionMode;
  thresholds: OrthogroupDiffThresholds;
  totalTested: number;             // total OGs that were statistically tested
  passedCount: number;             // count passing the selection filter
  entryCount: number;              // entries.length — may differ from passedCount in 'top_n_fallback'
  computedAt: string;
  groupingVersion: number;         // from _grouping_meta/lock.version
  orthofinderVersion: number;      // from _orthofinder_meta/state.activeVersion
  storagePath: string;             // orthogroup_diffs/v{N}/g{M}/{traitId}.json
  schemaVersion: number;           // currently 1
  /** @deprecated legacy top[] from pre-pagination docs. Replaced by Storage payload. */
  top?: OrthogroupDiffEntry[];
}

/** Storage-side full bundle written alongside each OrthogroupDiffDocument. */
export interface OrthogroupDiffPayload {
  schemaVersion: number;
  traitId: TraitId;
  groupLabels: string[];
  entries: OrthogroupDiffEntry[];
  entryCount: number;
  passedCount: number;
  selectionMode: SelectionMode;
  thresholds: OrthogroupDiffThresholds;
  computedAt: string;
  groupingVersion: number;
  orthofinderVersion: number;
}

/** Frontend fetch state for diff entries. */
export type DiffEntriesState =
  | { kind: 'idle' }
  | { kind: 'loading'; storagePath: string }
  | { kind: 'ready'; storagePath: string; payload: OrthogroupDiffPayload }
  | { kind: 'legacy'; entries: OrthogroupDiffEntry[] }
  | { kind: 'error'; storagePath: string; message: string };

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

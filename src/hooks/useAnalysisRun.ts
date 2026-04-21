import { useMemo } from 'react';
import type { AnalysisRun, AnalysisStepKey, AnalysisStepStatus, RunId } from '@/types/analysis-run';
import { decodeRunId } from '@/lib/analysis-run-id';

interface UseAnalysisRunState {
  run: AnalysisRun | null;
  loading: boolean;
  error: Error | null;
}

const PLACEHOLDER_STEP_AVAILABILITY: Record<AnalysisStepKey, AnalysisStepStatus> = {
  phenotype: 'pending',
  orthogroups: 'pending',
  variants: 'disabled',
  intersections: 'disabled',
  candidates: 'pending',
};

/**
 * Phase 1 placeholder. Resolves runId parts client-side and returns a
 * synthesized AnalysisRun with pending/disabled step statuses. Firestore
 * wiring lands in Phase 2 once analysis_runs documents exist.
 */
export function useAnalysisRun(runId: RunId | null | undefined): UseAnalysisRunState {
  return useMemo(() => {
    if (!runId) return { run: null, loading: false, error: null };
    const parts = decodeRunId(runId);
    if (!parts) {
      return { run: null, loading: false, error: new Error(`Invalid runId: ${runId}`) };
    }
    const now = new Date().toISOString();
    const run: AnalysisRun = {
      runId,
      traitId: parts.traitId,
      groupingVersion: parts.groupingVersion,
      orthofinderVersion: parts.orthofinderVersion,
      svReleaseId: parts.svReleaseVersion > 0 ? `sv_v${parts.svReleaseVersion}` : null,
      intersectionReleaseId: null,
      geneModelVersion: parts.geneModelVersion,
      scoringVersion: parts.scoringVersion,
      sampleSetVersion: `gm${parts.geneModelVersion}`,
      sampleCount: parts.geneModelVersion === 11 ? 11 : parts.geneModelVersion,
      status: 'stale',
      stepAvailability: PLACEHOLDER_STEP_AVAILABILITY,
      candidateCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    return { run, loading: false, error: null };
  }, [runId]);
}

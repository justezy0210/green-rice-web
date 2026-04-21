import { useEffect, useMemo, useState } from 'react';
import { subscribeAnalysisRun } from '@/lib/analysis-run-service';
import type {
  AnalysisRun,
  AnalysisStepKey,
  AnalysisStepStatus,
  RunId,
} from '@/types/analysis-run';
import { decodeRunId } from '@/lib/analysis-run-id';

interface UseAnalysisRunState {
  run: AnalysisRun | null;
  loading: boolean;
  source: 'firestore' | 'synthesized' | 'none';
  error: Error | null;
}

const DERIVED_STEP_AVAILABILITY: Record<AnalysisStepKey, AnalysisStepStatus> = {
  phenotype: 'ready',
  orthogroups: 'ready',
  variants: 'ready',
  intersections: 'disabled',
  candidates: 'ready',
};

/**
 * Prefers Firestore `analysis_runs/{runId}`; falls back to a runId-decoded
 * synthesized run so Phase 2A step pages still render before
 * `scripts/build-analysis-run.py` has been executed.
 */
export function useAnalysisRun(runId: RunId | null | undefined): UseAnalysisRunState {
  const [firestore, setFirestore] = useState<{
    run: AnalysisRun | null;
    key: string;
  } | null>(null);

  useEffect(() => {
    if (!runId) return;
    const unsub = subscribeAnalysisRun(runId, (run) => {
      setFirestore({ run, key: runId });
    });
    return () => unsub();
  }, [runId]);

  const synthesized = useMemo<AnalysisRun | null>(() => {
    if (!runId) return null;
    const parts = decodeRunId(runId);
    if (!parts) return null;
    const now = new Date().toISOString();
    return {
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
      stepAvailability: DERIVED_STEP_AVAILABILITY,
      candidateCount: 0,
      createdAt: now,
      updatedAt: now,
    };
  }, [runId]);

  if (!runId) {
    return { run: null, loading: false, source: 'none', error: null };
  }
  if (!decodeRunId(runId)) {
    return { run: null, loading: false, source: 'none', error: new Error(`Invalid runId: ${runId}`) };
  }
  if (!firestore || firestore.key !== runId) {
    return { run: null, loading: true, source: 'none', error: null };
  }
  if (firestore.run) {
    return { run: firestore.run, loading: false, source: 'firestore', error: null };
  }
  return { run: synthesized, loading: false, source: 'synthesized', error: null };
}

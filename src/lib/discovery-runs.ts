import type { AnalysisRun } from '@/types/analysis-run';

const CURRENT_SV_RELEASE_ID = 'sv_v1';
const CURRENT_INTERSECTION_RELEASE_ID = 'int_v1';
const CURRENT_SCORING_VERSION = 1;

export function isRepresentativeDiscoveryRun(run: AnalysisRun): boolean {
  return (
    run.status === 'ready' &&
    run.svReleaseId === CURRENT_SV_RELEASE_ID &&
    run.intersectionReleaseId === CURRENT_INTERSECTION_RELEASE_ID &&
    run.scoringVersion === CURRENT_SCORING_VERSION
  );
}

export function selectRepresentativeDiscoveryRuns(runs: AnalysisRun[]): AnalysisRun[] {
  const current = runs.filter(isRepresentativeDiscoveryRun);
  return pickLatestByTrait(current.length > 0 ? current : runs.filter((r) => r.status === 'ready'));
}

export function blockCountOf(run: AnalysisRun): number {
  return Number(run.blockCount ?? 0);
}

function pickLatestByTrait(runs: AnalysisRun[]): AnalysisRun[] {
  const byTrait = new Map<string, AnalysisRun>();
  for (const run of runs) {
    const previous = byTrait.get(run.traitId);
    if (!previous || compareUpdatedAt(run, previous) > 0) {
      byTrait.set(run.traitId, run);
    }
  }
  return Array.from(byTrait.values());
}

function compareUpdatedAt(a: AnalysisRun, b: AnalysisRun): number {
  const av = Date.parse(a.updatedAt ?? '') || 0;
  const bv = Date.parse(b.updatedAt ?? '') || 0;
  return av - bv;
}

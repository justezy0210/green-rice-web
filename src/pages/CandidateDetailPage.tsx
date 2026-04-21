import { useParams, Link, Navigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { ScopeStrip } from '@/components/common/ScopeStrip';
import { AnalysisShell } from '@/components/analysis/AnalysisShell';
import { CandidateScoreBoard } from '@/components/analysis/CandidateScoreBoard';
import { useAnalysisRun } from '@/hooks/useAnalysisRun';
import { useDerivedCandidates } from '@/hooks/useDerivedCandidates';
import { isValidRunId } from '@/lib/analysis-run-id';

export function CandidateDetailPage() {
  const { runId, candidateId } = useParams<{ runId: string; candidateId: string }>();
  const validRunId = runId && isValidRunId(runId) ? runId : null;
  const { run, error } = useAnalysisRun(validRunId);
  const { candidates, loading } = useDerivedCandidates(validRunId);

  if (!validRunId) return <Navigate to="/analysis" replace />;
  if (error || !run) {
    return (
      <div className="py-10 text-center text-sm text-gray-500">
        {error?.message ?? 'Run not found.'}
      </div>
    );
  }

  const candidate = candidates.find((c) => c.candidateId === candidateId);

  return (
    <AnalysisShell runId={validRunId} stepAvailability={run.stepAvailability}>
      <div className="space-y-4">
        <div className="text-sm text-gray-500">
          <Link
            to={`/analysis/${validRunId}/candidates`}
            className="hover:text-green-700 hover:underline"
          >
            ← Candidates
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-mono">{candidateId}</span>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">Resolving candidate…</p>
        ) : !candidate ? (
          <Card>
            <CardContent className="py-6 text-sm text-gray-500">
              Candidate <span className="font-mono">{candidateId}</span> not
              found in this run. It may have dropped below the p &lt; 0.05
              threshold.
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <h1 className="text-xl font-semibold text-gray-900 font-mono">
                      {candidate.primaryOgId}
                    </h1>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {candidate.functionSummary ?? (
                        <span className="text-gray-400">No functional annotation</span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0 text-right">
                    <span className="text-[10px] font-medium text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                      {candidate.candidateType}
                    </span>
                    <span className="text-xs text-gray-500">
                      rank {candidate.rank} · score {candidate.totalScore.toFixed(3)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500 pt-1 border-t border-gray-100 mt-2">
                  <span>Trait: <strong className="text-gray-700">{candidate.traitId}</strong></span>
                  {candidate.leadGeneId && (
                    <span>
                      Lead gene:{' '}
                      <Link
                        to={`/genes/${encodeURIComponent(candidate.leadGeneId)}`}
                        className="text-green-700 hover:underline font-mono"
                      >
                        {candidate.leadGeneId}
                      </Link>
                    </span>
                  )}
                  <Link
                    to={`/og/${encodeURIComponent(candidate.primaryOgId ?? '')}?trait=${candidate.traitId}`}
                    className="text-green-700 hover:underline"
                  >
                    Open OG detail →
                  </Link>
                </div>
              </CardContent>
            </Card>

            <ScopeStrip>
              Candidate evidence. Not causal, not validation-grade, not
              marker-ready. Observation-based ranking only.
            </ScopeStrip>

            <section>
              <h2 className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                Evidence scoreboard
              </h2>
              <CandidateScoreBoard scores={candidate.scoreBreakdown} />
            </section>

            <Card>
              <CardContent className="py-4">
                <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                  Summaries
                </h3>
                <dl className="text-sm text-gray-700 space-y-1.5">
                  {candidate.groupSpecificitySummary && (
                    <div>
                      <dt className="inline text-gray-500">Group specificity: </dt>
                      <dd className="inline">{candidate.groupSpecificitySummary}</dd>
                    </div>
                  )}
                  {candidate.orthogroupPatternSummary && (
                    <div>
                      <dt className="inline text-gray-500">OG pattern: </dt>
                      <dd className="inline">{candidate.orthogroupPatternSummary}</dd>
                    </div>
                  )}
                  {candidate.functionSummary && (
                    <div>
                      <dt className="inline text-gray-500">Function: </dt>
                      <dd className="inline">{candidate.functionSummary}</dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AnalysisShell>
  );
}

import { useParams, Link, Navigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { AnalysisShell } from '@/components/analysis/AnalysisShell';
import { useAnalysisRun } from '@/hooks/useAnalysisRun';
import { isValidRunId } from '@/lib/analysis-run-id';

export function CandidateDetailPage() {
  const { runId, candidateId } = useParams<{ runId: string; candidateId: string }>();
  const validRunId = runId && isValidRunId(runId) ? runId : null;
  const { run, error } = useAnalysisRun(validRunId);
  if (!validRunId) {
    return <Navigate to="/analysis" replace />;
  }
  if (error || !run) {
    return (
      <div className="py-10 text-center text-sm text-gray-500">
        {error?.message ?? 'Run not found.'}
      </div>
    );
  }

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
        <Card>
          <CardContent className="py-6 text-sm text-gray-600">
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">
              Candidate detail · Phase 2
            </p>
            <p>
              Seven-axis evidence scoreboard (Group specificity · Function · OG
              pattern · SV impact · Synteny · Expression · QTL), candidate-type
              badge, and linked entities will render here once{' '}
              <code className="text-[11px] bg-gray-100 px-1 py-0.5 rounded">
                analysis_runs/{validRunId}/candidates/{candidateId}
              </code>{' '}
              exists.
            </p>
          </CardContent>
        </Card>
      </div>
    </AnalysisShell>
  );
}

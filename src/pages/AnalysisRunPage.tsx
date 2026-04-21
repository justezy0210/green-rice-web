import { useParams, Navigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { AnalysisShell } from '@/components/analysis/AnalysisShell';
import { useAnalysisRun } from '@/hooks/useAnalysisRun';
import { isValidRunId } from '@/lib/analysis-run-id';

export function AnalysisRunPage() {
  const { runId } = useParams<{ runId: string }>();
  const validRunId = runId && isValidRunId(runId) ? runId : null;
  const { run, error } = useAnalysisRun(validRunId);
  if (!validRunId) {
    return <Navigate to="/analysis" replace />;
  }
  return <AnalysisRunOverview runId={validRunId} run={run} error={error} />;
}

function AnalysisRunOverview({
  runId,
  run,
  error,
}: {
  runId: string;
  run: ReturnType<typeof useAnalysisRun>['run'];
  error: ReturnType<typeof useAnalysisRun>['error'];
}) {

  if (error || !run) {
    return (
      <div className="py-10 text-center text-sm text-gray-500">
        {error?.message ?? 'Run not found.'}
      </div>
    );
  }

  return (
    <AnalysisShell runId={runId} stepAvailability={run.stepAvailability}>
      <div className="space-y-4">
        <header>
          <h1 className="text-xl font-semibold text-gray-900">Run overview</h1>
          <p className="text-sm text-gray-600 mt-1">
            Trait <strong>{run.traitId}</strong> · {run.sampleCount} samples ·
            scoring v{run.scoringVersion}
          </p>
        </header>

        <Card>
          <CardContent className="py-5 text-sm text-gray-700">
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">
              Status
            </p>
            <p>
              Phase 1 placeholder run. Step contents activate in Phase 2 once
              <code className="text-[11px] bg-gray-100 px-1 py-0.5 rounded mx-1">
                analysis_runs/{runId}
              </code>
              is materialized.
            </p>
          </CardContent>
        </Card>
      </div>
    </AnalysisShell>
  );
}

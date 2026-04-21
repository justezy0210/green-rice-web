import { useParams, Navigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { AnalysisShell } from '@/components/analysis/AnalysisShell';
import { useAnalysisRun } from '@/hooks/useAnalysisRun';
import { isValidRunId } from '@/lib/analysis-run-id';
import type { AnalysisStepKey } from '@/types/analysis-run';

interface StepPageProps {
  stepKey: AnalysisStepKey;
  title: string;
  phase: string;
  description: string;
}

function AnalysisStepPageBase({ stepKey, title, phase, description }: StepPageProps) {
  const { runId } = useParams<{ runId: string }>();
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

  const status = run.stepAvailability[stepKey];

  return (
    <AnalysisShell runId={validRunId} stepAvailability={run.stepAvailability}>
      <div className="space-y-4">
        <header>
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </header>
        <Card>
          <CardContent className="py-6 text-sm text-gray-600">
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">
              Step status: {status}
            </p>
            <p>
              Activates in {phase}. Wireframe only in Phase 1.
            </p>
          </CardContent>
        </Card>
      </div>
    </AnalysisShell>
  );
}

export function AnalysisStepIntersectionsPage() {
  return (
    <AnalysisStepPageBase
      stepKey="intersections"
      title="Step 4 — Intersections"
      phase="Phase 4 (after OG × SV intersect release)"
      description="OG × SV impact classes: gene body, CDS disruption, promoter, upstream, cluster enclosure, CNV, inversion boundary, TE-associated."
    />
  );
}


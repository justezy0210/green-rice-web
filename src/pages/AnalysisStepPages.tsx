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

export function AnalysisStepPhenotypePage() {
  return (
    <AnalysisStepPageBase
      stepKey="phenotype"
      title="Step 1 — Phenotype"
      phase="Phase 2"
      description="Proposed group definition, group balance, and QC placeholders. Small-sample candidate-discovery framing."
    />
  );
}

export function AnalysisStepOrthogroupsPage() {
  return (
    <AnalysisStepPageBase
      stepKey="orthogroups"
      title="Step 2 — Orthogroups"
      phase="Phase 2"
      description="OG ranking by copy-count contrast between proposed phenotype groups, with function facets."
    />
  );
}

export function AnalysisStepVariantsPage() {
  return (
    <AnalysisStepPageBase
      stepKey="variants"
      title="Step 3 — Variants"
      phase="Phase 3 (after SV matrix release)"
      description="Event-normalized SV table with per-group frequency and region jump."
    />
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

export function AnalysisStepCandidatesPage() {
  return (
    <AnalysisStepPageBase
      stepKey="candidates"
      title="Step 5 — Candidates"
      phase="Phase 2 (og_only type)"
      description="Ranked candidate list with 7-axis evidence scoreboard. Candidate is a module-scoped first-class object."
    />
  );
}

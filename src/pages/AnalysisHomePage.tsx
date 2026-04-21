import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';

const PHASE_1_NOTE =
  'Phase 1 — /analysis information architecture is in place. Workflow steps ' +
  'activate in Phase 2 (orthogroups + candidates with the existing OG copy ' +
  'matrix), Phase 3 (variants, after SV matrix precompute), and Phase 4 ' +
  '(intersections). See docs/exec-plans/active/2026-04-21-site-rebuild-analysis-workflow.md.';

export function AnalysisHomePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Analysis</h1>
        <p className="text-sm text-gray-600 mt-1">
          5-step candidate-discovery workflow over the 16-cultivar panel.
          Entity pages remain the primary browsing surface at{' '}
          <Link to="/cultivars" className="text-green-700 hover:underline">
            /cultivars
          </Link>
          ,{' '}
          <Link to="/genes" className="text-green-700 hover:underline">
            /genes
          </Link>
          , and{' '}
          <Link to="/og/OG0000001" className="text-green-700 hover:underline">
            /og
          </Link>
          .
        </p>
      </div>

      <Card>
        <CardContent className="py-6 text-sm text-gray-600">
          <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">
            Status
          </div>
          <p>{PHASE_1_NOTE}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-6">
          <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">
            Start a run (Phase 2)
          </div>
          <p className="text-sm text-gray-500">
            Trait selector and recent runs will appear here once{' '}
            <code className="text-[11px] bg-gray-100 px-1 py-0.5 rounded">
              analysis_runs
            </code>{' '}
            documents are populated. For now, navigate directly to a candidate
            run URL if you know its runId (format:{' '}
            <code className="text-[11px] bg-gray-100 px-1 py-0.5 rounded">
              {'{trait}_g{v}_of{v}_sv{v}_gm{v}_sc{v}'}
            </code>
            ).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { TRAITS } from '@/config/traits';
import { encodeRunId } from '@/lib/analysis-run-id';

const GROUPING_V = 4;
const ORTHOFINDER_V = 6;
const SV_V = 0;
const GENE_MODEL_V = 11;
const SCORING_V = 0;

const PHASE_NOTE =
  'Phase 2A · client-side candidate derivation from OrthoFinder × trait Mann-Whitney U. ' +
  'Step 3 (variants) and Step 4 (intersections) activate after SV matrix precompute.';

export function AnalysisHomePage() {
  const runs = TRAITS.map((t) => ({
    trait: t,
    runId: encodeRunId({
      traitId: t.id,
      groupingVersion: GROUPING_V,
      orthofinderVersion: ORTHOFINDER_V,
      svReleaseVersion: SV_V,
      geneModelVersion: GENE_MODEL_V,
      scoringVersion: SCORING_V,
    }),
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Analysis</h1>
        <p className="text-sm text-gray-600 mt-1">
          5-step candidate-discovery workflow. Entity pages remain the primary
          browsing surface at{' '}
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
        <CardContent className="py-4">
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">
            Phase
          </p>
          <p className="text-[12px] text-gray-600 leading-snug">{PHASE_NOTE}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4">
          <h2 className="text-xs uppercase tracking-wide text-gray-500 mb-3">
            Active runs — {TRAITS.length} traits
          </h2>
          <ul className="divide-y divide-gray-100">
            {runs.map((r) => (
              <li key={r.runId}>
                <Link
                  to={`/analysis/${r.runId}`}
                  className="flex items-center justify-between gap-3 py-2 px-1 rounded hover:bg-green-50 transition-colors"
                >
                  <span className="min-w-0">
                    <span className="text-sm font-medium text-gray-900 block">
                      {r.trait.label}
                    </span>
                    <span className="font-mono text-[10px] text-gray-500 block truncate">
                      {r.runId}
                    </span>
                  </span>
                  <span className="text-xs text-green-700 shrink-0">
                    Open →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

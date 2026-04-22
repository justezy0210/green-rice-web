import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { useAnalysisRuns } from '@/hooks/useAnalysisRuns';
import { TRAITS } from '@/config/traits';

// 2026-04-22 curated review regions — surfaced as direct deep links.
const CURATED_HIGHLIGHTS: Array<{
  blockId: string;
  runId: string;
  label: string;
  region: string;
  traits: string;
}> = [
  {
    blockId: 'curated_blb_chr11_resistance_block',
    runId: 'bacterial_leaf_blight_g4_of6_sv1_gm11_sc1',
    label: 'BLB resistance block',
    region: 'chr11:27–29 Mb',
    traits: 'bacterial_leaf_blight',
  },
  {
    blockId: 'curated_shared_chr11_dev_block',
    runId: 'heading_date_g4_of6_sv1_gm11_sc1',
    label: 'Shared chr11 development block',
    region: 'chr11:21–25 Mb',
    traits: 'heading_date · culm_length · spikelets_per_panicle',
  },
  {
    blockId: 'curated_heading_shared_chr06',
    runId: 'heading_date_g4_of6_sv1_gm11_sc1',
    label: 'Heading × culm chr06 block',
    region: 'chr06:9–11 Mb',
    traits: 'heading_date · culm_length',
  },
];

export function AnalysisHomePage() {
  const { runs, loading, error } = useAnalysisRuns();

  const traitLabel = new Map(TRAITS.map((t) => [t.id, t.label]));

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
          <h2 className="text-xs uppercase tracking-wide text-gray-500 mb-3">
            Current review blocks
          </h2>
          <ul className="divide-y divide-gray-100">
            {CURATED_HIGHLIGHTS.map((h) => (
              <li key={h.blockId}>
                <Link
                  to={`/analysis/${h.runId}/block/${encodeURIComponent(h.blockId)}`}
                  className="flex items-center justify-between gap-3 py-2 px-1 rounded hover:bg-amber-50 transition-colors"
                >
                  <span className="min-w-0">
                    <span className="text-sm font-medium text-gray-900 block">
                      {h.label}
                      <span className="ml-2 text-[10px] uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 rounded px-1 py-[1px]">
                        curated
                      </span>
                    </span>
                    <span className="text-[11px] text-gray-500 block truncate">
                      {h.region} · {h.traits}
                    </span>
                  </span>
                  <span className="text-[11px] text-green-700 shrink-0">Open →</span>
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4">
          <h2 className="text-xs uppercase tracking-wide text-gray-500 mb-3">
            Analysis runs
          </h2>
          {loading ? (
            <p className="text-sm text-gray-400">Loading analysis runs…</p>
          ) : error ? (
            <p className="text-sm text-red-500">{error.message}</p>
          ) : runs.length === 0 ? (
            <p className="text-sm text-gray-500 leading-snug">
              No analysis runs present. Runs materialise once{' '}
              <code className="text-[11px] bg-gray-100 px-1 py-0.5 rounded">
                scripts/promote-analysis-run.py
              </code>{' '}
              has been executed against Firestore.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {runs.map((r) => (
                <li key={r.runId}>
                  <Link
                    to={`/analysis/${r.runId}`}
                    className="flex items-center justify-between gap-3 py-2 px-1 rounded hover:bg-green-50 transition-colors"
                  >
                    <span className="min-w-0">
                      <span className="text-sm font-medium text-gray-900 block">
                        {traitLabel.get(r.traitId) ?? r.traitId}
                      </span>
                      <span className="font-mono text-[10px] text-gray-500 block truncate">
                        {r.runId}
                      </span>
                    </span>
                    <span className="flex items-center gap-3 shrink-0 text-[11px] text-gray-500">
                      <span>
                        <strong className="text-gray-700 tabular-nums">
                          {r.candidateCount}
                        </strong>{' '}
                        candidates
                      </span>
                      <span className="text-green-700">Open →</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

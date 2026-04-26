import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { JumpToBlockChip } from '@/components/discovery/JumpToBlockChip';
import type { Candidate } from '@/types/candidate';
import type { RunId } from '@/types/analysis-run';

interface Props {
  runId: RunId;
  candidate: Candidate | null;
  loading: boolean;
}

function formatP(p: number | null | undefined): string {
  if (p === null || p === undefined) return '—';
  if (p < 1e-4) return p.toExponential(1);
  return p.toFixed(3);
}

/**
 * Trait-aware summary rendered when /og/:id is entered with ?trait=…
 * and the corresponding candidate exists in analysis_runs.
 */
export function OgActiveRunCard({ runId, candidate, loading }: Props) {
  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex items-baseline justify-between mb-1">
          <h3 className="text-xs uppercase tracking-wide text-gray-500">
            Active run
          </h3>
          <code className="text-[10px] font-mono text-gray-400">{runId}</code>
        </div>
        {loading ? (
          <p className="text-[12px] text-gray-400">Resolving candidate…</p>
        ) : !candidate ? (
          <p className="text-[12px] text-gray-500 leading-snug">
            This OG has no candidate row in the trait run (did not pass
            p&lt;0.05 threshold).
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-gray-700">
            <span>
              rank{' '}
              <strong className="text-gray-900 tabular-nums">
                {candidate.rank}
              </strong>
            </span>
            <span>
              <span className="text-[10px] uppercase tracking-wide text-gray-500 font-medium bg-gray-100 px-1.5 py-0.5 rounded">
                {candidate.candidateType}
              </span>
            </span>
            <span className="tabular-nums">
              combined{' '}
              <strong className="text-gray-900">
                {(candidate.combinedScore ?? candidate.totalScore).toFixed(3)}
              </strong>
            </span>
            {candidate.pValue !== undefined && (
              <span className="tabular-nums">
                p <strong className="text-gray-900">{formatP(candidate.pValue)}</strong>
              </span>
            )}
            {candidate.log2FoldChange !== null && candidate.log2FoldChange !== undefined && (
              <span className="tabular-nums">
                log₂FC{' '}
                <strong className="text-gray-900">
                  {candidate.log2FoldChange.toFixed(2)}
                </strong>
              </span>
            )}
            <span className="ml-auto flex items-center gap-2">
              <JumpToBlockChip runId={runId} blockId={candidate.blockId} />
              <Link
                to={`/discovery/${runId}/candidate/${candidate.candidateId}`}
                className="text-[11px] text-green-700 hover:underline"
              >
                Candidate detail →
              </Link>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

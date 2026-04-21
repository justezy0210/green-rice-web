import { useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { AnalysisShell } from '@/components/analysis/AnalysisShell';
import { useAnalysisRun } from '@/hooks/useAnalysisRun';
import { useCandidates } from '@/hooks/useCandidates';
import { isValidRunId } from '@/lib/analysis-run-id';
import type { Candidate } from '@/types/candidate';

const PAGE_SIZE = 25;

export function AnalysisStepCandidatesPage() {
  const { runId } = useParams<{ runId: string }>();
  const validRunId = runId && isValidRunId(runId) ? runId : null;
  const { run, error } = useAnalysisRun(validRunId);
  const { candidates, loading } = useCandidates(validRunId);
  const [page, setPage] = useState(0);

  if (!validRunId) return <Navigate to="/analysis" replace />;
  if (error || !run) {
    return (
      <div className="py-10 text-center text-sm text-gray-500">
        {error?.message ?? 'Run not found.'}
      </div>
    );
  }

  const pages = Math.max(1, Math.ceil(candidates.length / PAGE_SIZE));
  const pageSlice = candidates.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <AnalysisShell runId={validRunId} stepAvailability={run.stepAvailability}>
      <div className="space-y-4">
        <header>
          <h1 className="text-xl font-semibold text-gray-900">
            Step 5 — Candidates
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Ranked candidate list for trait <strong>{run.traitId}</strong>.{' '}
            <code className="text-[11px] bg-gray-100 px-1 py-0.5 rounded">og_only</code>{' '}
            type from OG × trait Mann-Whitney U.
          </p>
        </header>

        <Card>
          <CardContent className="py-4">
            {loading ? (
              <p className="text-sm text-gray-400">Deriving candidates…</p>
            ) : candidates.length === 0 ? (
              <p className="text-sm text-gray-500">
                No candidates passed the p &lt; 0.05 threshold for this run.
              </p>
            ) : (
              <>
                <div className="text-xs text-gray-500 mb-2">
                  {candidates.length} candidate{candidates.length === 1 ? '' : 's'} · page{' '}
                  {page + 1} / {pages}
                </div>
                <CandidateTable runId={validRunId} candidates={pageSlice} />
                {pages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-3 text-xs">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="px-2 py-1 rounded border border-gray-200 text-gray-700 disabled:text-gray-300 disabled:border-gray-100 hover:bg-gray-50"
                    >
                      ← Prev
                    </button>
                    <span className="text-gray-500">
                      {page + 1} / {pages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
                      disabled={page >= pages - 1}
                      className="px-2 py-1 rounded border border-gray-200 text-gray-700 disabled:text-gray-300 disabled:border-gray-100 hover:bg-gray-50"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AnalysisShell>
  );
}

function CandidateTable({
  runId,
  candidates,
}: {
  runId: string;
  candidates: Candidate[];
}) {
  return (
    <table className="w-full text-sm table-fixed">
      <colgroup>
        <col className="w-12" />
        <col className="w-28" />
        <col className="w-20" />
        <col />
        <col />
        <col />
        <col className="w-20" />
      </colgroup>
      <thead>
        <tr className="text-[10px] uppercase tracking-wide text-gray-500 border-b border-gray-200">
          <th className="text-left pl-3 pr-2 py-1.5">Rank</th>
          <th className="text-left px-3 py-1.5">OG</th>
          <th className="text-left px-3 py-1.5">Type</th>
          <th className="text-left px-3 py-1.5">Group specificity</th>
          <th className="text-left px-3 py-1.5">OG pattern</th>
          <th className="text-left px-3 py-1.5">Function</th>
          <th className="text-right pl-3 pr-4 py-1.5">Score</th>
        </tr>
      </thead>
      <tbody>
        {candidates.map((c) => (
          <tr
            key={c.candidateId}
            className="border-b border-gray-100 hover:bg-green-50 transition-colors"
          >
            <td className="pl-3 pr-2 py-1.5 text-gray-500 tabular-nums">{c.rank}</td>
            <td className="px-3 py-1.5">
              <Link
                to={`/analysis/${runId}/candidate/${c.candidateId}`}
                className="text-green-700 hover:underline font-mono text-[12px]"
              >
                {c.primaryOgId}
              </Link>
            </td>
            <td className="px-3 py-1.5">
              <span className="text-[10px] font-medium text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                {c.candidateType}
              </span>
            </td>
            <td className="px-3 py-1.5 text-[11px] text-gray-600 truncate">
              {c.groupSpecificitySummary ?? '—'}
            </td>
            <td className="px-3 py-1.5 text-[11px] text-gray-600 truncate">
              {c.orthogroupPatternSummary ?? '—'}
            </td>
            <td className="px-3 py-1.5 text-[11px] text-gray-600 truncate">
              {c.functionSummary ?? <span className="text-gray-400">no annotation</span>}
            </td>
            <td className="pl-3 pr-4 py-1.5 text-right tabular-nums font-medium text-gray-900">
              {c.totalScore.toFixed(3)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

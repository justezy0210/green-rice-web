import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useOrthogroupDiff } from '@/hooks/useOrthogroupDiff';
import { useOrthogroupDiffEntries } from '@/hooks/useOrthogroupDiffEntries';
import { sortEntries } from '@/lib/og-diff-filters';
import type { AnalysisRun } from '@/types/analysis-run';
import type { OrthogroupDiffEntry } from '@/types/orthogroup';

interface Props {
  run: AnalysisRun;
  traitLabel: string;
}

const TOP_N = 3;

/**
 * Single analysis-run row on the Analysis home page. Pulls the top-N
 * OGs for the run's trait and exposes them as side chips so a
 * trait-first researcher can jump straight to the OG detail without
 * traversing the full 5-step workflow first.
 *
 * Sorting goes through the same `sortEntries(entries, 'p')` helper as
 * the Step 2 page so the home preview stays consistent with the full
 * ranking surface (p ascending, mean-diff descending tie-break).
 */
export function AnalysisRunRow({ run, traitLabel }: Props) {
  const { doc } = useOrthogroupDiff(run.traitId);
  const entriesState = useOrthogroupDiffEntries(doc);

  const topOgs = useMemo<{ ogId: string; p: number | null }[]>(() => {
    let entries: OrthogroupDiffEntry[] | null = null;
    if (entriesState.kind === 'ready') entries = entriesState.payload.entries ?? [];
    else if (entriesState.kind === 'legacy') entries = entriesState.entries;
    if (!entries) return [];
    return sortEntries(entries, 'p')
      .slice(0, TOP_N)
      .map((e) => ({ ogId: e.orthogroup, p: e.pValue ?? null }));
  }, [entriesState]);

  return (
    <li className="flex items-center justify-between gap-3 py-2 px-1 rounded hover:bg-green-50/40">
      <div className="min-w-0">
        <div className="text-sm font-medium text-gray-900">
          {traitLabel}
        </div>
        <div className="font-mono text-[10px] text-gray-500 truncate">
          {run.runId}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 text-[11px] text-gray-500">
        {topOgs.length > 0 && (
          <span className="flex items-center gap-1">
            <span className="text-[10px] uppercase tracking-wide text-gray-400">
              Top
            </span>
            {topOgs.map((og) => (
              <Link
                key={og.ogId}
                to={`/og/${encodeURIComponent(og.ogId)}?trait=${encodeURIComponent(run.traitId)}`}
                title={
                  og.p !== null
                    ? `${og.ogId} · p=${og.p < 1e-4 ? og.p.toExponential(1) : og.p.toFixed(3)}`
                    : og.ogId
                }
                className="font-mono text-[11px] px-1.5 py-[1px] rounded border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
              >
                {og.ogId}
              </Link>
            ))}
          </span>
        )}
        <span>
          <strong className="text-gray-700 tabular-nums">
            {run.candidateCount}
          </strong>{' '}
          candidates
        </span>
        <Link
          to={`/analysis/${run.runId}/orthogroups`}
          className="text-green-700 hover:underline"
        >
          OG ranking →
        </Link>
        <Link
          to={`/analysis/${run.runId}`}
          className="text-gray-600 hover:underline"
        >
          Workflow →
        </Link>
      </div>
    </li>
  );
}

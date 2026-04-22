import { Link } from 'react-router-dom';
import type { Candidate } from '@/types/candidate';

interface Props {
  runId: string;
  candidates: Candidate[];
  limit?: number;
}

export function BlockCandidateTable({ runId, candidates, limit = 30 }: Props) {
  if (candidates.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No candidate rows for this block.
      </p>
    );
  }
  const rows = candidates.slice(0, limit);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm table-fixed">
        <colgroup>
          <col className="w-14" />
          <col className="w-28" />
          <col className="w-24" />
          <col />
          <col className="w-24" />
          <col className="w-20" />
        </colgroup>
        <thead>
          <tr className="text-[10px] uppercase tracking-wide text-gray-500 border-b border-gray-200">
            <th className="text-left pl-3 pr-2 py-1.5">Rank</th>
            <th className="text-left px-3 py-1.5">OG</th>
            <th className="text-left px-3 py-1.5">Type</th>
            <th className="text-left px-3 py-1.5">Function</th>
            <th className="text-left px-3 py-1.5">Best SV</th>
            <th className="text-right pl-3 pr-4 py-1.5">Score</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
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
              <td className="px-3 py-1.5 text-[11px] text-gray-600 truncate" title={c.functionSummary ?? ''}>
                {c.functionSummary ?? <span className="text-gray-400">no annotation</span>}
              </td>
              <td className="px-3 py-1.5 text-[11px] text-gray-600 truncate">
                {c.bestSv ? (
                  <span>
                    <span className="font-mono text-[10px]">{c.bestSv.eventId}</span>{' '}
                    <span className="text-gray-400">{c.bestSv.svType}</span>
                  </span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className="pl-3 pr-4 py-1.5 text-right tabular-nums font-medium text-gray-900">
                {(c.combinedScore ?? c.totalScore).toFixed(3)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {candidates.length > rows.length && (
        <p className="text-[11px] text-gray-400 mt-2">
          showing top {rows.length} of {candidates.length}
        </p>
      )}
    </div>
  );
}

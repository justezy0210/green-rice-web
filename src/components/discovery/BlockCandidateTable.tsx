import { Link } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  discoveryTableCellClass,
  discoveryTableClass,
  discoveryTableHeaderClass,
  discoveryTableHeadRowClass,
  discoveryTableRowClass,
} from '@/components/discovery/DiscoveryTableStyles';
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
    <div>
      <Table density="dense" className={discoveryTableClass}>
        <colgroup>
          <col className="w-14" />
          <col className="w-28" />
          <col className="w-24" />
          <col />
          <col className="w-24" />
          <col className="w-20" />
        </colgroup>
        <TableHeader className={discoveryTableHeaderClass}>
          <TableRow className={discoveryTableHeadRowClass}>
            <TableHead className="pl-3">Rank</TableHead>
            <TableHead className="px-3">OG</TableHead>
            <TableHead className="px-3">Type</TableHead>
            <TableHead className="px-3">Function</TableHead>
            <TableHead className="px-3">Best SV</TableHead>
            <TableHead className="pl-3 pr-4 text-right">Score</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((c) => (
            <TableRow key={c.candidateId} className={discoveryTableRowClass}>
              <TableCell
                className={discoveryTableCellClass({
                  position: 'first',
                  className: 'pl-3 text-gray-500 tabular-nums',
                })}
              >
                {c.rank}
              </TableCell>
              <TableCell className={discoveryTableCellClass({ className: 'px-3' })}>
                <Link
                  to={`/discovery/${runId}/candidate/${encodeURIComponent(c.candidateId)}`}
                  className="text-green-700 hover:underline font-mono text-[12px]"
                >
                  {c.primaryOgId}
                </Link>
              </TableCell>
              <TableCell className={discoveryTableCellClass({ className: 'px-3' })}>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 h-auto">
                  {c.candidateType}
                </Badge>
              </TableCell>
              <TableCell
                className={discoveryTableCellClass({
                  className: 'px-3 text-[11px] text-gray-600 truncate',
                })}
                title={c.functionSummary ?? ''}
              >
                {c.functionSummary ?? <span className="text-gray-400">no annotation</span>}
              </TableCell>
              <TableCell
                className={discoveryTableCellClass({
                  className: 'px-3 text-[11px] text-gray-600 truncate',
                })}
              >
                {c.bestSv ? (
                  <span>
                    <span className="font-mono text-[10px]">{c.bestSv.eventId}</span>{' '}
                    <span className="text-gray-400">{c.bestSv.svType}</span>
                  </span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </TableCell>
              <TableCell
                className={discoveryTableCellClass({
                  position: 'last',
                  className: 'pl-3 pr-4 text-right tabular-nums font-medium text-gray-900',
                })}
              >
                {(c.combinedScore ?? c.totalScore).toFixed(3)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {candidates.length > rows.length && (
        <p className="text-[11px] text-gray-400 mt-2">
          showing top {rows.length} of {candidates.length}
        </p>
      )}
    </div>
  );
}

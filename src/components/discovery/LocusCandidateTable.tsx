import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  discoveryTableCellClass,
  discoveryTableClass,
  discoveryTableHeaderClass,
  discoveryTableHeadRowClass,
  discoveryTableRowClass,
} from '@/components/discovery/DiscoveryTableStyles';
import { TRAITS } from '@/config/traits';
import type { CandidateBlock } from '@/types/candidate-block';
import type { Candidate } from '@/types/candidate';

const PAGE_SIZE = 25;
const traitLabel = new Map<string, string>(TRAITS.map((trait) => [trait.id, trait.label]));

interface Props {
  candidates: Candidate[];
  blocks: CandidateBlock[];
  loading: boolean;
  error: Error | null;
}

export function LocusCandidateTable({ candidates, blocks, loading, error }: Props) {
  const [page, setPage] = useState(0);
  const sortedCandidates = sortPriorityLeads(candidates);
  const pages = Math.max(1, Math.ceil(sortedCandidates.length / PAGE_SIZE));
  const pageIndex = Math.min(page, pages - 1);
  const rows = sortedCandidates.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE);
  const blocksByKey = new Map(blocks.map((block) => [`${block.runId}:${block.blockId}`, block]));

  if (loading) {
    return <p className="text-sm text-gray-400">Loading locus candidates...</p>;
  }
  if (error) {
    return <p className="text-sm text-red-500">{error.message}</p>;
  }
  if (candidates.length === 0) {
    return <p className="text-sm text-gray-500">No candidates are attached to this locus.</p>;
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
        <span>
          {candidates.length.toLocaleString()} candidate leads, ordered by score
        </span>
        <span>
          page {pageIndex + 1} / {pages}
        </span>
      </div>
      <Table density="dense" className={`${discoveryTableClass} min-w-[1040px]`}>
        <colgroup>
          <col className="w-40" />
          <col className="w-36" />
          <col className="w-40" />
          <col />
          <col className="w-36" />
          <col className="w-20" />
          <col className="w-32" />
        </colgroup>
        <TableHeader className={discoveryTableHeaderClass}>
          <TableRow className={discoveryTableHeadRowClass}>
            <TableHead className="pl-3">Trait</TableHead>
            <TableHead className="px-3">Lead OG</TableHead>
            <TableHead className="px-3">Lead gene</TableHead>
            <TableHead className="px-3">Function</TableHead>
            <TableHead className="px-3">SV / Region</TableHead>
            <TableHead className="pl-3 pr-4 text-right">Score</TableHead>
            <TableHead className="pl-3 pr-4">Next</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((candidate) => (
            <CandidateRow
              key={`${candidate.runId}:${candidate.candidateId}`}
              candidate={candidate}
              block={candidate.blockId ? blocksByKey.get(`${candidate.runId}:${candidate.blockId}`) : null}
            />
          ))}
        </TableBody>
      </Table>
      {pages > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2 text-xs">
          <Button
            variant="outline"
            size="xs"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={pageIndex === 0}
          >
            Prev
          </Button>
          <span className="text-gray-500">
            {pageIndex + 1} / {pages}
          </span>
          <Button
            variant="outline"
            size="xs"
            onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
            disabled={pageIndex >= pages - 1}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

function CandidateRow({
  candidate,
  block,
}: {
  candidate: Candidate;
  block: CandidateBlock | null | undefined;
}) {
  return (
    <TableRow className={discoveryTableRowClass}>
      <TableCell
        className={discoveryTableCellClass({
          position: 'first',
          className: 'min-w-0 pl-3 text-[11px] text-gray-700',
        })}
      >
        <div className="truncate" title={traitLabel.get(candidate.traitId) ?? candidate.traitId}>
          {traitLabel.get(candidate.traitId) ?? candidate.traitId}
        </div>
        <div className="mt-0.5 text-[10px] text-gray-400">rank {candidate.rank}</div>
      </TableCell>
      <TableCell className={discoveryTableCellClass({ className: 'min-w-0 px-3' })}>
        {candidate.primaryOgId ? (
          <Link
            to={`/og/${encodeURIComponent(candidate.primaryOgId)}?trait=${candidate.traitId}`}
            className="block truncate font-mono text-[12px] text-green-700 hover:underline"
            title={candidate.primaryOgId}
          >
            {candidate.primaryOgId}
          </Link>
        ) : (
          <span className="block truncate font-mono text-[11px] text-gray-500" title={candidate.candidateId}>
            {candidate.candidateId}
          </span>
        )}
      </TableCell>
      <TableCell className={discoveryTableCellClass({ className: 'min-w-0 px-3' })}>
        {candidate.leadGeneId ? (
          <Link
            to={`/genes/${encodeURIComponent(candidate.leadGeneId)}`}
            className="block truncate font-mono text-[11px] text-green-700 hover:underline"
            title={candidate.leadGeneId}
          >
            {candidate.leadGeneId}
          </Link>
        ) : (
          <span className="text-[11px] text-gray-400">inspect OG members</span>
        )}
      </TableCell>
      <TableCell
        className={discoveryTableCellClass({
          className: 'min-w-0 px-3 text-[11px] text-gray-600',
        })}
        title={candidate.functionSummary ?? ''}
      >
        <div className="truncate">
          {candidate.functionSummary ?? <span className="text-gray-400">no annotation</span>}
        </div>
      </TableCell>
      <TableCell
        className={discoveryTableCellClass({
          className: 'min-w-0 px-3 text-[11px] text-gray-600',
        })}
      >
        {candidate.bestSv || candidate.leadRegion ? (
          <span className="block min-w-0 space-y-0.5">
            {candidate.bestSv && (
              <span className="block truncate" title={candidate.bestSv.eventId}>
                <span className="font-mono text-[10px]">{candidate.bestSv.eventId}</span>{' '}
                <span className="text-gray-400">{candidate.bestSv.svType}</span>
              </span>
            )}
            {candidate.leadRegion && (
              <Link
                to={regionUrl(candidate.leadRegion)}
                className="block truncate font-mono text-[10px] text-green-700 hover:underline"
                title={`${candidate.leadRegion.chr}:${candidate.leadRegion.start}-${candidate.leadRegion.end}`}
              >
                {candidate.leadRegion.chr}:{Math.round(candidate.leadRegion.start / 1_000_000)}-
                {Math.round(candidate.leadRegion.end / 1_000_000)} Mb
              </Link>
            )}
          </span>
        ) : (
          <span className="text-gray-400">none</span>
        )}
      </TableCell>
      <TableCell
        className={discoveryTableCellClass({
          className: 'pl-3 pr-4 text-right tabular-nums font-medium text-gray-900',
        })}
      >
        {(candidate.combinedScore ?? candidate.totalScore).toFixed(3)}
      </TableCell>
      <TableCell
        className={discoveryTableCellClass({
          position: 'last',
          className: 'pl-3 pr-4 whitespace-nowrap',
        })}
      >
        <div className="flex items-center justify-end gap-2 text-[11px]">
          <Link
            to={`/discovery/${candidate.runId}/candidate/${encodeURIComponent(candidate.candidateId)}`}
            className="text-green-700 hover:underline"
          >
            Candidate
          </Link>
          {block && (
            <Link
              to={`/discovery/${block.runId}/block/${encodeURIComponent(block.blockId)}`}
              className="text-gray-500 hover:text-green-700 hover:underline"
            >
              Source
            </Link>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

function sortPriorityLeads(candidates: Candidate[]): Candidate[] {
  return [...candidates].sort((a, b) => {
    const scoreDelta = (b.combinedScore ?? b.totalScore) - (a.combinedScore ?? a.totalScore);
    if (scoreDelta !== 0) return scoreDelta;
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.traitId.localeCompare(b.traitId);
  });
}

function regionUrl(region: NonNullable<Candidate['leadRegion']>): string {
  return `/region/${region.cultivar}/${region.chr}/${region.start}-${region.end}`;
}

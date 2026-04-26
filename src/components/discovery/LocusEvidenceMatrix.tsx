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
import { BlockTypeBadge } from '@/components/discovery/BlockTypeBadge';
import {
  discoveryTableCellClass,
  discoveryTableClass,
  discoveryTableHeaderClass,
  discoveryTableHeadRowClass,
  discoveryTableRowClass,
} from '@/components/discovery/DiscoveryTableStyles';
import { TRAITS } from '@/config/traits';
import type { DiscoveryBlockGroup } from '@/lib/discovery-block-groups';
import type { CandidateBlock } from '@/types/candidate-block';

const traitLabel = new Map<string, string>(TRAITS.map((trait) => [trait.id, trait.label]));

interface Props {
  group: DiscoveryBlockGroup;
}

export function LocusEvidenceMatrix({ group }: Props) {
  const representativeKey = blockKey(group.representative);
  const rows = [...group.blocks].sort((a, b) => {
    if (blockKey(a) === representativeKey) return -1;
    if (blockKey(b) === representativeKey) return 1;
    if (b.candidateOgCount !== a.candidateOgCount) {
      return b.candidateOgCount - a.candidateOgCount;
    }
    return a.traitId.localeCompare(b.traitId);
  });

  return (
    <Table density="dense" className={discoveryTableClass}>
      <colgroup>
        <col className="w-36" />
        <col className="w-28" />
        <col className="w-28" />
        <col className="w-24" />
        <col />
        <col className="w-28" />
        <col className="w-20" />
      </colgroup>
      <TableHeader className={discoveryTableHeaderClass}>
        <TableRow className={discoveryTableHeadRowClass}>
          <TableHead className="pl-3">Trait</TableHead>
          <TableHead className="px-3">Groups</TableHead>
          <TableHead className="px-3">Evidence type</TableHead>
          <TableHead className="px-3 text-right">Evidence</TableHead>
          <TableHead className="px-3">Lead OGs</TableHead>
          <TableHead className="px-3">Lead SV</TableHead>
          <TableHead className="pl-3 pr-4">Source</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((block) => (
          <EvidenceRow
            key={blockKey(block)}
            block={block}
            representative={blockKey(block) === representativeKey}
          />
        ))}
      </TableBody>
    </Table>
  );
}

function EvidenceRow({
  block,
  representative,
}: {
  block: CandidateBlock;
  representative: boolean;
}) {
  const [low, high] = block.groupLabels;
  const nLow = block.groupCounts[low] ?? 0;
  const nHigh = block.groupCounts[high] ?? 0;
  const topOgs = block.topOgIds.slice(0, 3);
  const leadSv = block.leadSvs[0] ?? null;
  const tone = representative ? 'active' : 'default';

  return (
    <TableRow className={discoveryTableRowClass}>
      <TableCell
        className={discoveryTableCellClass({
          position: 'first',
          tone,
          className: 'pl-3',
        })}
      >
        <div className="text-[13px] font-medium text-gray-900">
          {traitLabel.get(block.traitId) ?? block.traitId}
        </div>
        {representative && (
          <div className="mt-0.5 text-[10px] text-green-700">representative</div>
        )}
      </TableCell>
      <TableCell
        className={discoveryTableCellClass({
          tone,
          className: 'px-3 text-[11px] text-gray-600 tabular-nums',
        })}
      >
        <span className="font-mono">{low}</span> {nLow} /{' '}
        <span className="font-mono">{high}</span> {nHigh}
      </TableCell>
      <TableCell className={discoveryTableCellClass({ tone, className: 'px-3' })}>
        <div className="flex flex-wrap items-center gap-1">
          <BlockTypeBadge blockType={block.blockType} />
          {block.curated && (
            <Badge variant="warning" className="h-auto rounded px-1 py-0.5 text-[9px]">
              curated
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell
        className={discoveryTableCellClass({
          tone,
          className: 'px-3 text-right text-[11px] tabular-nums text-gray-800',
        })}
      >
        <div>{block.candidateOgCount} OG</div>
        <div className="text-gray-500">{block.intersectionCount} intersections</div>
      </TableCell>
      <TableCell className={discoveryTableCellClass({ tone, className: 'px-3' })}>
        <span className="inline-flex flex-wrap gap-1">
          {topOgs.length === 0 ? (
            <span className="text-[11px] text-gray-400">none</span>
          ) : (
            topOgs.map((og) => (
              <Link
                key={og}
                to={`/og/${encodeURIComponent(og)}?trait=${block.traitId}`}
                className="rounded border border-indigo-200 bg-indigo-50 px-1 py-[1px] font-mono text-[10px] text-indigo-700 hover:bg-indigo-100"
              >
                {og}
              </Link>
            ))
          )}
        </span>
      </TableCell>
      <TableCell
        className={discoveryTableCellClass({
          tone,
          className: 'px-3 text-[11px] text-gray-600',
        })}
      >
        {leadSv ? (
          <span className="font-mono text-[10px] text-gray-700">{leadSv.eventId}</span>
        ) : (
          <span className="text-gray-400">none</span>
        )}
      </TableCell>
      <TableCell
        className={discoveryTableCellClass({
          position: 'last',
          tone,
          className: 'pl-3 pr-4',
        })}
      >
        <Link
          to={`/discovery/${block.runId}/block/${encodeURIComponent(block.blockId)}`}
          className="text-[11px] text-green-700 hover:underline"
        >
          Source
        </Link>
      </TableCell>
    </TableRow>
  );
}

function blockKey(block: CandidateBlock): string {
  return `${block.runId}:${block.blockId}`;
}

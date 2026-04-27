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
import type { TraitId } from '@/types/traits';

const traitLabel = new Map<string, string>(TRAITS.map((trait) => [trait.id, trait.label]));

interface Props {
  group: DiscoveryBlockGroup;
  selectedTraitId: TraitId | null;
  onSelectTrait: (traitId: TraitId) => void;
}

export function LocusEvidenceMatrix({
  group,
  selectedTraitId,
  onSelectTrait,
}: Props) {
  const rows = [...group.blocks].sort((a, b) => {
    return a.traitId.localeCompare(b.traitId);
  });

  return (
    <Table density="dense" className={discoveryTableClass}>
      <colgroup>
        <col className="w-36" />
        <col className="w-40" />
        <col />
      </colgroup>
      <TableHeader className={discoveryTableHeaderClass}>
        <TableRow className={discoveryTableHeadRowClass}>
          <TableHead className="pl-3">Trait</TableHead>
          <TableHead className="px-3">Group comparison</TableHead>
          <TableHead className="px-3 pr-4">Review type</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((block) => (
          <EvidenceRow
            key={blockKey(block)}
            block={block}
            selected={block.traitId === selectedTraitId}
            onSelectTrait={onSelectTrait}
          />
        ))}
      </TableBody>
    </Table>
  );
}

function EvidenceRow({
  block,
  selected,
  onSelectTrait,
}: {
  block: CandidateBlock;
  selected: boolean;
  onSelectTrait: (traitId: TraitId) => void;
}) {
  const [low, high] = block.groupLabels;
  const nLow = block.groupCounts[low] ?? 0;
  const nHigh = block.groupCounts[high] ?? 0;
  const label = traitLabel.get(block.traitId) ?? block.traitId;
  const tone = selected ? 'active' : 'default';

  return (
    <TableRow
      className={`${discoveryTableRowClass} cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1`}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      title={selected ? 'Clear trait filter' : `Show only ${label}`}
      onClick={() => onSelectTrait(block.traitId)}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        onSelectTrait(block.traitId);
      }}
    >
      <TableCell
        className={discoveryTableCellClass({
          position: 'first',
          tone,
          className: 'pl-3',
        })}
      >
        <div className="text-[13px] font-medium text-gray-900 group-hover:text-green-700 group-hover:underline">
          {label}
        </div>
        {selected && (
          <div className="mt-0.5 text-[10px] text-green-700">filter active</div>
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
      <TableCell
        className={discoveryTableCellClass({
          position: 'last',
          tone,
          className: 'px-3 pr-4',
        })}
      >
        <div className="flex flex-wrap items-center gap-1">
          <BlockTypeBadge blockType={block.blockType} />
          {block.curated && (
            <Badge variant="warning" className="h-auto rounded px-1 py-0.5 text-[9px]">
              curated
            </Badge>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

function blockKey(block: CandidateBlock): string {
  return `${block.runId}:${block.blockId}`;
}

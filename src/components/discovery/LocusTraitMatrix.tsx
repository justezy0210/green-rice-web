import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  formatBlockRegion,
  groupDiscoveryBlocks,
  type DiscoveryBlockGroup,
} from '@/lib/discovery-block-groups';
import {
  displayNameForDiscoveryBlockGroup,
  slugForDiscoveryBlockGroup,
} from '@/lib/discovery-locus-slugs';
import type { AnalysisRun } from '@/types/analysis-run';
import type { TraitId } from '@/types/traits';
import type { CandidateBlock, BlockRegion } from '@/types/candidate-block';

const CHR_LENGTH_BP: Record<string, number> = {
  chr01: 43_270_923,
  chr02: 35_937_250,
  chr03: 36_413_819,
  chr04: 35_502_694,
  chr05: 29_958_434,
  chr06: 31_248_787,
  chr07: 29_697_621,
  chr08: 28_443_022,
  chr09: 23_012_720,
  chr10: 23_207_287,
  chr11: 29_021_106,
  chr12: 27_531_856,
};

const TRAIT_ABBR: Partial<Record<TraitId, string>> = {
  heading_date: 'HD',
  culm_length: 'CL',
  spikelets_per_panicle: 'SPP',
  bacterial_leaf_blight: 'BLB',
  grain_weight: 'GW',
  panicle_length: 'PL',
  panicle_number: 'PN',
  pre_harvest_sprouting: 'PHS',
  ripening_rate: 'RR',
};

interface Props {
  blocks: CandidateBlock[];
  runs: AnalysisRun[];
  loading: boolean;
  error: Error | null;
  traitLabel: (traitId: string) => string;
}

export function LocusTraitMatrix({ blocks, runs, loading, error, traitLabel }: Props) {
  const groups = groupDiscoveryBlocks(blocks).slice(0, 8);
  const maxCellCount = Math.max(1, ...blocks.map((block) => block.candidateOgCount));

  return (
    <Card>
      <CardContent className="py-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-xs uppercase tracking-wide text-gray-500">
            Priority review loci
          </h2>
          <span className="text-[10px] text-gray-400">
            curated and repeated loci first
          </span>
        </div>
        {loading ? (
          <p className="text-sm text-gray-400">Loading review loci...</p>
        ) : error ? (
          <p className="text-sm text-red-500">{error.message}</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-gray-500">
            No review loci are materialized for the current representative runs.
          </p>
        ) : (
          <Table density="dense" className="table-fixed border-separate border-spacing-y-1">
            <colgroup>
              <col className="w-[28%]" />
              {runs.map((run) => (
                <col key={run.runId} />
              ))}
              <col className="w-20" />
              <col className="w-28" />
              <col className="w-20" />
              <col className="w-16" />
            </colgroup>
            <TableHeader className="[&_tr]:border-0">
              <TableRow className="border-0 text-[10px] uppercase tracking-wide text-gray-500 hover:bg-transparent">
                <TableHead className="pl-3 text-gray-500">Locus</TableHead>
                {runs.map((run) => (
                  <TableHead
                    key={run.runId}
                    className="px-1 text-center text-gray-500"
                    title={traitLabel(run.traitId)}
                  >
                    {traitAbbr(run.traitId)}
                  </TableHead>
                ))}
                <TableHead className="px-3 text-right text-gray-500">OGs</TableHead>
                <TableHead className="px-3 text-right text-gray-500">Intersections</TableHead>
                <TableHead className="px-3 text-gray-500">Type</TableHead>
                <TableHead className="pl-3 pr-4 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => (
                <LocusRow
                  key={group.key}
                  group={group}
                  runs={runs}
                  maxCellCount={maxCellCount}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function LocusRow({
  group,
  runs,
  maxCellCount,
}: {
  group: DiscoveryBlockGroup;
  runs: AnalysisRun[];
  maxCellCount: number;
}) {
  const to = `/discovery/locus/${slugForDiscoveryBlockGroup(group)}`;
  const byTrait = new Map(group.blocks.map((block) => [block.traitId, block]));

  return (
    <TableRow className="group border-0 hover:bg-transparent">
      <TableCell className="rounded-l-md border-y border-l border-gray-100 bg-white pl-3 group-hover:bg-amber-50/50">
        <Link to={to} className="block min-w-0 hover:text-green-700">
          <span className="block truncate text-sm font-medium text-gray-900 group-hover:text-green-800">
            {displayNameForDiscoveryBlockGroup(group)}
          </span>
          <span className="mt-1 flex items-center gap-2">
            <span className="font-mono text-[10px] text-gray-500">
              {formatBlockRegion(group.region)}
            </span>
            <CoordinateMarker region={group.region} />
          </span>
        </Link>
      </TableCell>

      {runs.map((run) => (
        <TableCell
          key={run.runId}
          className="border-y border-gray-100 bg-white px-1 group-hover:bg-amber-50/50"
        >
          <TraitCell block={byTrait.get(run.traitId)} maxCellCount={maxCellCount} />
        </TableCell>
      ))}

      <TableCell className="border-y border-gray-100 bg-white px-3 text-right tabular-nums text-gray-900 group-hover:bg-amber-50/50">
        {group.candidateOgTotal.toLocaleString()}
      </TableCell>
      <TableCell className="border-y border-gray-100 bg-white px-3 text-right tabular-nums text-gray-900 group-hover:bg-amber-50/50">
        {group.intersectionTotal.toLocaleString()}
      </TableCell>
      <TableCell className="border-y border-gray-100 bg-white px-3 group-hover:bg-amber-50/50">
        <Badge
          variant={group.curated ? 'warning' : 'outline'}
          className="h-auto rounded px-1.5 py-0.5 text-[10px]"
        >
          {group.curated ? 'curated' : 'auto'}
        </Badge>
      </TableCell>
      <TableCell className="rounded-r-md border-y border-r border-gray-100 bg-white pl-3 pr-4 text-right group-hover:bg-amber-50/50">
        <Link
          to={to}
          className="inline-flex items-center gap-1 text-xs text-green-700 hover:underline"
        >
          Open
          <ArrowRight className="size-3" aria-hidden />
        </Link>
      </TableCell>
    </TableRow>
  );
}

function TraitCell({
  block,
  maxCellCount,
}: {
  block: CandidateBlock | undefined;
  maxCellCount: number;
}) {
  if (!block) {
    return (
      <div className="mx-auto h-7 rounded border border-gray-100 bg-gray-50/60" />
    );
  }

  const strength = block.candidateOgCount / maxCellCount;
  const className =
    strength > 0.75
      ? 'border-green-700 bg-green-700 text-white'
      : strength > 0.4
        ? 'border-green-500 bg-green-500 text-white'
        : strength > 0.16
          ? 'border-green-300 bg-green-100 text-green-900'
          : 'border-green-200 bg-green-50 text-green-800';

  return (
    <div
      className={`mx-auto flex h-7 items-center justify-center rounded border text-[10px] tabular-nums ${className}`}
      title={`${block.traitId}: ${block.candidateOgCount} candidate OGs, ${block.intersectionCount} intersections`}
    >
      {block.candidateOgCount}
    </div>
  );
}

function CoordinateMarker({ region }: { region: BlockRegion }) {
  const length = CHR_LENGTH_BP[region.chr] ?? Math.max(region.end, 1);
  const x = Math.max(0, Math.min(100, (region.start / length) * 100));
  const width = Math.max(3, Math.min(100 - x, ((region.end - region.start) / length) * 100));

  return (
    <span className="relative h-1.5 w-20 rounded bg-gray-100" aria-hidden>
      <span
        className="absolute top-0 h-1.5 rounded bg-gray-500"
        style={{ left: `${x}%`, width: `${width}%` }}
      />
    </span>
  );
}

function traitAbbr(traitId: string): string {
  if (traitId in TRAIT_ABBR) return TRAIT_ABBR[traitId as TraitId] ?? traitId;
  const parts = traitId.split('_');
  if (parts.length === 1) return traitId.slice(0, 3).toUpperCase();
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
}

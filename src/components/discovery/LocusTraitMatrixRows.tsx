import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { LocusCoordinateMarker } from '@/components/discovery/LocusCoordinateMarker';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CandidateSummary,
  ReviewSvCount,
  StrongestPattern,
} from '@/components/discovery/LocusReviewSummaryCells';
import { formatBlockRegion, type DiscoveryBlockGroup } from '@/lib/discovery-block-groups';
import {
  displayNameForDiscoveryBlockGroup,
  slugForDiscoveryBlockGroup,
} from '@/lib/discovery-locus-slugs';
import type { DiscoveryLocusReviewSummary } from '@/lib/discovery-locus-review-summary';

interface RowProps {
  group: DiscoveryBlockGroup;
  summary: DiscoveryLocusReviewSummary | null;
  traitLabel: (traitId: string) => string;
  traitOrder: Map<string, number>;
}

export function LocusReviewTable({
  groups,
  summaries,
  summaryLoading,
  traitLabel,
  traitOrder,
}: {
  groups: DiscoveryBlockGroup[];
  summaries: Map<string, DiscoveryLocusReviewSummary>;
  summaryLoading: boolean;
  traitLabel: (traitId: string) => string;
  traitOrder: Map<string, number>;
}) {
  return (
    <Table density="dense" className="table-fixed border-separate border-spacing-y-1">
      <colgroup>
        <col className="w-[28%]" />
        <col className="w-[18%]" />
        <col className="w-24" />
        <col className="w-[27%]" />
        <col className="w-[19%]" />
        <col className="w-20" />
      </colgroup>
      <TableHeader className="[&_tr]:border-0">
        <TableRow className="border-0 text-[10px] uppercase tracking-wide text-gray-500 hover:bg-transparent">
          <TableHead className="pl-3 text-gray-500">Locus</TableHead>
          <TableHead className="px-3 text-gray-500">Traits</TableHead>
          <TableHead className="px-3 text-right text-gray-500">SVs to review</TableHead>
          <TableHead className="px-3 text-gray-500">Strongest pattern</TableHead>
          <TableHead className="px-3 text-gray-500">Candidate</TableHead>
          <TableHead className="px-3 text-gray-500">Type</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {groups.map((group) => (
          <LocusRow
            key={group.key}
            group={group}
            summary={summaries.get(group.key) ?? null}
            summaryLoading={summaryLoading}
            traitLabel={traitLabel}
            traitOrder={traitOrder}
          />
        ))}
      </TableBody>
    </Table>
  );
}

export function FallbackLocusList({
  groups,
  summaries,
  traitLabel,
  traitOrder,
}: {
  groups: DiscoveryBlockGroup[];
  summaries: Map<string, DiscoveryLocusReviewSummary>;
  traitLabel: (traitId: string) => string;
  traitOrder: Map<string, number>;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
        No locus has a selected SV under the current review threshold. The rows below keep the
        trait context visible without promoting a specific SV.
      </div>
      <Table density="dense" className="table-fixed border-separate border-spacing-y-1">
        <colgroup>
          <col className="w-[34%]" />
          <col className="w-[24%]" />
          <col />
          <col className="w-28" />
        </colgroup>
        <TableHeader className="[&_tr]:border-0">
          <TableRow className="border-0 text-[10px] uppercase tracking-wide text-gray-500 hover:bg-transparent">
            <TableHead className="pl-3 text-gray-500">Locus</TableHead>
            <TableHead className="px-3 text-gray-500">Traits</TableHead>
            <TableHead className="px-3 text-gray-500">Current review status</TableHead>
            <TableHead className="px-3 text-gray-500">Type</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => (
            <FallbackLocusRow
              key={group.key}
              group={group}
              summary={summaries.get(group.key) ?? null}
              traitLabel={traitLabel}
              traitOrder={traitOrder}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function LocusRow({
  group,
  summary,
  summaryLoading,
  traitLabel,
  traitOrder,
}: RowProps & { summaryLoading: boolean }) {
  const orderedTraits = orderedTraitIds(group, traitOrder);

  return (
    <ClickableLocusRow group={group}>
      <TableCell className="rounded-l-md border-y border-l border-gray-100 bg-white pl-3 group-hover:bg-amber-50/50">
        <div className="block min-w-0">
          <span className="block truncate text-sm font-medium text-gray-900 group-hover:text-green-800">
            {displayNameForDiscoveryBlockGroup(group)}
          </span>
          <span className="mt-1 flex items-center gap-2">
            <span className="font-mono text-[10px] text-gray-500">
              {formatBlockRegion(group.region)}
            </span>
            <LocusCoordinateMarker region={group.region} />
          </span>
        </div>
      </TableCell>
      <TableCell className="border-y border-gray-100 bg-white px-3 group-hover:bg-amber-50/50">
        <TraitChips traitIds={orderedTraits} traitLabel={traitLabel} />
      </TableCell>
      <TableCell className="border-y border-gray-100 bg-white px-3 text-right group-hover:bg-amber-50/50">
        <ReviewSvCount summary={summary} loading={summaryLoading} />
      </TableCell>
      <TableCell className="border-y border-gray-100 bg-white px-3 group-hover:bg-amber-50/50">
        <StrongestPattern summary={summary} traitLabel={traitLabel} />
      </TableCell>
      <TableCell className="border-y border-gray-100 bg-white px-3 group-hover:bg-amber-50/50">
        <CandidateSummary summary={summary} />
      </TableCell>
      <TypeCell group={group} />
    </ClickableLocusRow>
  );
}

function FallbackLocusRow({ group, traitLabel, traitOrder }: RowProps) {
  return (
    <ClickableLocusRow group={group}>
      <TableCell className="rounded-l-md border-y border-l border-gray-100 bg-white pl-3 group-hover:bg-amber-50/50">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-gray-900 group-hover:text-green-800">
            {displayNameForDiscoveryBlockGroup(group)}
          </div>
          <div className="mt-1 font-mono text-[10px] text-gray-500">
            {formatBlockRegion(group.region)}
          </div>
        </div>
      </TableCell>
      <TableCell className="border-y border-gray-100 bg-white px-3 group-hover:bg-amber-50/50">
        <TraitChips traitIds={orderedTraitIds(group, traitOrder)} traitLabel={traitLabel} />
      </TableCell>
      <TableCell className="border-y border-gray-100 bg-white px-3 group-hover:bg-amber-50/50">
        <div className="text-[11px] text-gray-700">
          <div>No SV pattern passed the current priority threshold.</div>
          <div className="mt-0.5 text-gray-500">Open the locus to review trait context.</div>
        </div>
      </TableCell>
      <TypeCell group={group} />
    </ClickableLocusRow>
  );
}

function ClickableLocusRow({
  group,
  children,
}: {
  group: DiscoveryBlockGroup;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const openLocus = () => navigate(`/discovery/locus/${slugForDiscoveryBlockGroup(group)}`);

  return (
    <TableRow
      className="group cursor-pointer border-0 hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
      role="link"
      tabIndex={0}
      aria-label={`Open ${displayNameForDiscoveryBlockGroup(group)}`}
      onClick={openLocus}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openLocus();
        }
      }}
    >
      {children}
    </TableRow>
  );
}

function TraitChips({
  traitIds,
  traitLabel,
}: {
  traitIds: string[];
  traitLabel: (traitId: string) => string;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {traitIds.map((traitId) => (
        <span
          key={traitId}
          className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] text-gray-600"
          title={traitId}
        >
          {traitLabel(traitId)}
        </span>
      ))}
    </div>
  );
}

function TypeCell({ group }: { group: DiscoveryBlockGroup }) {
  return (
    <TableCell className="rounded-r-md border-y border-r border-gray-100 bg-white px-3 group-hover:bg-amber-50/50">
      <Badge
        variant={group.curated ? 'warning' : 'outline'}
        className="h-auto rounded px-1.5 py-0.5 text-[10px]"
      >
        {group.curated ? 'curated' : 'auto'}
      </Badge>
    </TableCell>
  );
}

function orderedTraitIds(
  group: DiscoveryBlockGroup,
  traitOrder: Map<string, number>,
): string[] {
  return [...group.traitIds].sort(
    (a, b) => (traitOrder.get(a) ?? 999) - (traitOrder.get(b) ?? 999),
  );
}

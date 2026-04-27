import { Link } from 'react-router-dom';
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
  ogDetailTableCellClass,
  ogDetailTableClass,
  ogDetailTableHeaderClass,
  ogDetailTableHeadRowClass,
  ogDetailTableRowClass,
} from '@/components/og-detail/OgDetailTableStyles';
import { IRGSP_DISPLAY_NAME, isReferencePathCultivar } from '@/lib/irgsp-constants';
import { cn } from '@/lib/utils';
import type { CultivarGroupAssignment } from '@/types/grouping';
import type { PavPerCultivar } from '@/lib/pav-evidence';

type GroupAssignmentLike = CultivarGroupAssignment | string;

interface CultivarLite {
  id: string;
  name: string;
}

interface Props {
  members: Record<string, string[]>;
  cultivars: CultivarLite[];
  groupByCultivar?: Record<string, GroupAssignmentLike> | null;
  activeTraitId?: string | null;
  pavRows?: PavPerCultivar[];
}

export function OgMemberGenesTable({
  members,
  cultivars,
  groupByCultivar = null,
  activeTraitId = null,
  pavRows = [],
}: Props) {
  const knownIds = new Set(cultivars.flatMap((c) => keyVariants(c.id, c.name)));
  const showGroups = Boolean(activeTraitId);
  const memberByKey = normalizedMap(members);
  const groupByKey = groupByCultivar ? normalizedMap(groupByCultivar) : new Map<string, GroupAssignmentLike>();
  const pavByKey = new Map(pavRows.map((row) => [normalizeKey(row.cultivar), row]));
  const showPav = pavRows.length > 0;
  const rows = [
    ...cultivars
      .map((c) => ({
        id: c.id,
        label: c.name,
        geneIds: findByKeys(memberByKey, c.id, c.name) ?? [],
        group: findByKeys(groupByKey, c.id, c.name) ?? null,
        pav: findByKeys(pavByKey, c.id, c.name) ?? null,
        href: `/cultivar/${encodeURIComponent(c.name)}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    ...Object.keys(members)
      .filter((id) => !knownIds.has(normalizeKey(id)))
      .sort()
      .map((id) => ({
        id,
        label: isReferencePathCultivar(id) ? IRGSP_DISPLAY_NAME : id,
        geneIds: members[id] ?? [],
        group: null,
        pav: null,
        href: null,
      })),
  ];
  const memberGeneCount = rows.reduce((sum, row) => sum + row.geneIds.length, 0);

  return (
    <Card>
      <CardContent className="py-3">
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-xs uppercase tracking-wide text-gray-500">
            Orthogroup members
          </h3>
          <span className="text-[10px] text-gray-400">
            {rows.length} genomes · {memberGeneCount} member genes
            {showGroups ? ' · active trait groups shown' : ''}
          </span>
        </div>
        <Table density="dense" className={`${ogDetailTableClass} min-w-[720px]`}>
          <colgroup>
            <col className="w-40" />
            <col className="w-20" />
            <col />
            {showPav && <col className="w-32" />}
          </colgroup>
          <TableHeader className={ogDetailTableHeaderClass}>
            <TableRow className={ogDetailTableHeadRowClass}>
              <TableHead className="pl-3">Cultivar / genome</TableHead>
              <TableHead className="px-3 text-right">Copy</TableHead>
              <TableHead className="px-3">Gene IDs</TableHead>
              {showPav && <TableHead className="pl-3 pr-4">PAV state</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} className={ogDetailTableRowClass}>
                <TableCell className={ogDetailTableCellClass({ position: 'first', className: 'min-w-0 pl-3 text-gray-800' })}>
                  {row.href ? (
                    <span className="flex min-w-0 items-center gap-1.5">
                      <Link to={row.href} className="truncate hover:text-green-700 hover:underline">
                        {row.label}
                      </Link>
                      {showGroups && <GroupBadge assignment={row.group} />}
                    </span>
                  ) : (
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate">{row.label}</span>
                      {showGroups && <GroupBadge assignment={row.group} />}
                    </span>
                  )}
                </TableCell>
                <TableCell className={ogDetailTableCellClass({ className: 'px-3 text-right tabular-nums text-gray-800' })}>
                  {row.geneIds.length}
                </TableCell>
                <TableCell className={ogDetailTableCellClass({ position: showPav ? 'middle' : 'last', className: 'min-w-0 px-3 text-[11px]' })}>
                  <GeneLinks geneIds={row.geneIds} />
                </TableCell>
                {showPav && (
                  <TableCell className={ogDetailTableCellClass({ position: 'last', className: 'pl-3 pr-4' })}>
                    <PavState state={row.pav?.pavClass ?? null} />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function GroupBadge({ assignment }: { assignment: GroupAssignmentLike | null }) {
  if (!assignment) return <span className="shrink-0 text-[10px] text-gray-400">group pending</span>;
  const groupLabel = typeof assignment === 'string' ? assignment : assignment.groupLabel;
  const borderline = typeof assignment !== 'string' && assignment.borderline;
  return (
    <span
      className="shrink-0 rounded border border-amber-200 bg-amber-50 px-1.5 py-[1px] font-mono text-[10px] text-amber-800"
      title={`phenotype group${borderline ? ' · borderline' : ''}`}
    >
      {groupLabel}
      {borderline ? '*' : ''}
    </span>
  );
}

const PAV_LABEL: Record<string, string> = {
  present: 'present',
  'absent-evidence-pending': 'absent pending',
  duplicated: 'duplicated',
};

const PAV_CLASS: Record<string, string> = {
  present: 'border-green-200 bg-green-50 text-green-700',
  'absent-evidence-pending': 'border-gray-200 bg-gray-50 text-gray-500',
  duplicated: 'border-violet-200 bg-violet-50 text-violet-700',
};

function PavState({ state }: { state: string | null }) {
  if (!state) return <span className="text-[10px] text-gray-400">—</span>;
  return (
    <span className={cn('rounded border px-1.5 py-[1px] font-mono text-[10px]', PAV_CLASS[state])}>
      {PAV_LABEL[state] ?? state}
    </span>
  );
}

function GeneLinks({ geneIds }: { geneIds: string[] }) {
  if (geneIds.length === 0) return <span className="text-gray-400">—</span>;
  return (
    <span className="flex flex-wrap gap-x-2 gap-y-1">
      {geneIds.map((geneId) => (
        <Link
          key={geneId}
          to={`/genes/${encodeURIComponent(geneId)}`}
          className="font-mono text-[10px] text-gray-700 hover:text-green-700 hover:underline"
        >
          {geneId}
        </Link>
      ))}
    </span>
  );
}

function normalizedMap<T>(source: Record<string, T>): Map<string, T> {
  const result = new Map<string, T>();
  for (const [key, value] of Object.entries(source)) {
    result.set(normalizeKey(key), value);
  }
  return result;
}

function findByKeys<T>(source: Map<string, T>, ...keys: string[]): T | null {
  for (const key of keyVariants(...keys)) {
    const value = source.get(key);
    if (value !== undefined) return value;
  }
  return null;
}

function keyVariants(...keys: string[]): string[] {
  return Array.from(new Set(keys.map(normalizeKey)));
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[\s_-]+/g, '');
}

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
import { Badge } from '@/components/ui/badge';
import {
  ogDetailTableCellClass,
  ogDetailTableClass,
  ogDetailTableHeaderClass,
  ogDetailTableHeadRowClass,
  ogDetailTableRowClass,
} from '@/components/og-detail/OgDetailTableStyles';
import { isReferencePathCultivar } from '@/lib/irgsp-constants';
import { cn } from '@/lib/utils';
import type { PavPerCultivar } from '@/lib/pav-evidence';

interface Props {
  /** OG → cultivarId → geneIds[], from useOgDrilldown. */
  members: Record<string, string[]> | null;
  cultivars: Array<{ id: string; name: string }>;
  /** Per-cultivar trait group label (when available), from groupingDoc.assignments. */
  groupByCultivar: Record<string, { groupLabel?: string; borderline?: boolean }> | null;
  /** Classified PAV rows (3-class MVP). */
  pavRows: PavPerCultivar[];
}

/**
 * Compact group-sorted table replacing the standalone PAV card in
 * the OG detail redesign. Puts the four columns a researcher needs
 * to reconstruct the narrative (cultivar · group · copy · gene IDs
 * · PAV state) on one compact row.
 */
export function OgCultivarCopyMap({ members, cultivars, groupByCultivar, pavRows }: Props) {
  const pavByCultivar = new Map(pavRows.map((r) => [r.cultivar, r]));
  const panel = cultivars.filter((c) => !isReferencePathCultivar(c.id));
  const rows = panel.map((c) => {
    const geneIds = members?.[c.id] ?? [];
    const assign = groupByCultivar?.[c.id];
    const pav = pavByCultivar.get(c.id);
    return {
      id: c.id,
      name: c.name,
      groupLabel: assign?.groupLabel ?? null,
      borderline: Boolean(assign?.borderline),
      copy: geneIds.length,
      geneIds,
      pavState: pav?.pavClass ?? 'absent-evidence-pending',
    };
  });

  rows.sort((a, b) => {
    const ga = a.groupLabel ?? 'zzz';
    const gb = b.groupLabel ?? 'zzz';
    if (ga !== gb) return ga.localeCompare(gb);
    return a.name.localeCompare(b.name);
  });

  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="text-xs uppercase tracking-wide text-gray-500">
            Cultivar copy map
          </h3>
          <span className="text-[10px] text-gray-400">
            {panel.length} panel cultivars · sorted by group
          </span>
        </div>
        <Table density="dense" className={`${ogDetailTableClass} min-w-[760px]`}>
          <colgroup>
            <col className="w-32" />
            <col className="w-20" />
            <col className="w-14" />
            <col />
            <col className="w-32" />
          </colgroup>
          <TableHeader className={ogDetailTableHeaderClass}>
            <TableRow className={ogDetailTableHeadRowClass}>
              <TableHead className="pl-3">Cultivar</TableHead>
              <TableHead className="px-3">Group</TableHead>
              <TableHead className="px-3 text-right">Copy</TableHead>
              <TableHead className="px-3">Gene IDs</TableHead>
              <TableHead className="pl-3 pr-4">PAV state</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} className={ogDetailTableRowClass}>
                <TableCell
                  className={ogDetailTableCellClass({
                    position: 'first',
                    className: 'min-w-0 pl-3 text-gray-800',
                  })}
                >
                  <Link
                    to={`/cultivar/${encodeURIComponent(r.name)}`}
                    className="block truncate hover:text-green-700 hover:underline"
                    title={r.name}
                  >
                    {r.name}
                  </Link>
                </TableCell>
                <TableCell className={ogDetailTableCellClass({ className: 'px-3 text-[11px]' })}>
                  {r.groupLabel ? (
                    <span className="font-mono text-gray-700">
                      {r.groupLabel}
                      {r.borderline && (
                        <span className="ml-1 text-[9px] text-amber-700">borderline</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </TableCell>
                <TableCell
                  className={ogDetailTableCellClass({
                    className: 'px-3 text-right tabular-nums text-gray-800',
                  })}
                >
                  {r.copy}
                </TableCell>
                <TableCell
                  className={ogDetailTableCellClass({
                    className: 'min-w-0 px-3 text-[11px]',
                  })}
                >
                  <GeneIdsList geneIds={r.geneIds} />
                </TableCell>
                <TableCell
                  className={ogDetailTableCellClass({
                    position: 'last',
                    className: 'pl-3 pr-4',
                  })}
                >
                  <PavStateBadge state={r.pavState} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function GeneIdsList({ geneIds }: { geneIds: string[] }) {
  if (geneIds.length === 0) return <span className="text-gray-400">—</span>;
  return (
    <span className="inline-flex max-w-full gap-1 truncate">
      {geneIds.slice(0, 3).map((g) => (
        <Link
          key={g}
          to={`/genes/${encodeURIComponent(g)}`}
          className="shrink truncate font-mono text-[10px] text-gray-700 hover:text-green-700 hover:underline"
          title={g}
        >
          {g}
        </Link>
      ))}
      {geneIds.length > 3 && (
        <span className="text-[10px] text-gray-400">…+{geneIds.length - 3}</span>
      )}
    </span>
  );
}

const PAV_STATE_LABEL: Record<string, string> = {
  present: 'present',
  'absent-evidence-pending': 'absent (evidence pending)',
  duplicated: 'duplicated',
};

const PAV_STATE_CLASS: Record<string, string> = {
  present: 'bg-green-50 text-green-700 border-green-200',
  'absent-evidence-pending': 'bg-gray-50 text-gray-500 border-gray-200',
  duplicated: 'bg-violet-50 text-violet-700 border-violet-200',
};

function PavStateBadge({ state }: { state: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[10px] font-mono px-1.5 py-0.5 rounded border h-auto',
        PAV_STATE_CLASS[state] ?? PAV_STATE_CLASS['absent-evidence-pending'],
      )}
    >
      {PAV_STATE_LABEL[state] ?? state}
    </Badge>
  );
}

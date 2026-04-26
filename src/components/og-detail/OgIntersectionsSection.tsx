import { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import {
  ogDetailTableCellClass,
  ogDetailTableClass,
  ogDetailTableHeaderClass,
  ogDetailTableHeadRowClass,
  ogDetailTableRowClass,
} from '@/components/og-detail/OgDetailTableStyles';
import { useOgIntersectionBundle } from '@/hooks/useBlock';
import type { IntersectionRow, ImpactClass } from '@/types/intersection';

interface Props {
  ogId: string;
  intersectionReleaseId: string;
}

const COLLAPSED_LIMIT = 10;

/**
 * Lists every OG × SV overlap across runs for this orthogroup. Data
 * comes from the pre-built `og_sv_intersections/{intRelId}/by_og/{og}`
 * Storage bundle.
 */
export function OgIntersectionsSection({ ogId, intersectionReleaseId }: Props) {
  const { bundle, loading } = useOgIntersectionBundle(intersectionReleaseId, ogId);
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-3 text-[12px] text-gray-400">
          Loading intersections…
        </CardContent>
      </Card>
    );
  }
  const rows: Array<IntersectionRow & { runId: string }> = [];
  for (const r of bundle?.runs ?? []) {
    for (const row of r.rows) {
      rows.push({ ...row, runId: r.runId });
    }
  }
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-3">
          <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-1">
            OG × SV intersections
          </h3>
          <p className="text-[12px] text-gray-500">
            No SV overlaps recorded for this OG in{' '}
            <code className="text-[11px] bg-gray-100 px-1 py-0.5 rounded">
              {intersectionReleaseId}
            </code>
            .
          </p>
        </CardContent>
      </Card>
    );
  }
  rows.sort((a, b) => (b.absDeltaAf ?? 0) - (a.absDeltaAf ?? 0));
  const visible = expanded ? rows : rows.slice(0, COLLAPSED_LIMIT);
  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="text-xs uppercase tracking-wide text-gray-500">
            OG × SV intersections
          </h3>
          <span className="text-[10px] text-gray-400">
            {rows.length} row{rows.length === 1 ? '' : 's'} across {bundle?.runs.length ?? 0} run
            {bundle?.runs.length === 1 ? '' : 's'}
          </span>
        </div>
        <Table density="dense" className={`${ogDetailTableClass} min-w-[760px]`}>
          <colgroup>
            <col className="w-28" />
            <col className="w-20" />
            <col className="w-24" />
            <col className="w-24" />
            <col />
            <col className="w-16" />
          </colgroup>
          <TableHeader className={ogDetailTableHeaderClass}>
            <TableRow className={ogDetailTableHeadRowClass}>
              <TableHead className="pl-3">SV</TableHead>
              <TableHead className="px-3">Type</TableHead>
              <TableHead className="px-3">Impact</TableHead>
              <TableHead className="px-3">Cultivar</TableHead>
              <TableHead className="px-3">Gene</TableHead>
              <TableHead className="pl-3 pr-4 text-right">|ΔAF|</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((r, idx) => (
              <TableRow key={`${r.runId}:${r.eventId}:${idx}`} className={ogDetailTableRowClass}>
                <TableCell
                  className={ogDetailTableCellClass({
                    position: 'first',
                    className: 'min-w-0 pl-3 font-mono text-[11px] text-gray-800',
                  })}
                >
                  <span className="block truncate" title={r.eventId}>
                    {r.eventId}
                  </span>
                </TableCell>
                <TableCell
                  className={ogDetailTableCellClass({
                    className: 'px-3 text-[11px] text-gray-600',
                  })}
                >
                  {r.svType}
                </TableCell>
                <TableCell className={ogDetailTableCellClass({ className: 'px-3 text-[11px]' })}>
                  <ImpactBadge impactClass={r.impactClass} />
                </TableCell>
                <TableCell
                  className={ogDetailTableCellClass({
                    className: 'min-w-0 px-3 text-[11px] text-gray-600',
                  })}
                >
                  <span className="block truncate" title={r.cultivar}>
                    {r.cultivar}
                  </span>
                </TableCell>
                <TableCell
                  className={ogDetailTableCellClass({
                    className: 'min-w-0 px-3 text-[11px]',
                  })}
                >
                  {r.geneId ? (
                    <Link
                      to={`/genes/${encodeURIComponent(r.geneId)}`}
                      className="block truncate font-mono text-gray-700 hover:text-green-700 hover:underline"
                      title={r.geneId}
                    >
                      {r.geneId}
                    </Link>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </TableCell>
                <TableCell
                  className={ogDetailTableCellClass({
                    position: 'last',
                    className: 'pl-3 pr-4 text-right tabular-nums text-gray-800',
                  })}
                >
                  {typeof r.absDeltaAf === 'number' ? r.absDeltaAf.toFixed(2) : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {rows.length > COLLAPSED_LIMIT && (
          <Button
            variant="link"
            size="xs"
            className="mt-2 text-[11px] text-green-700 px-0"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? `Show only ${COLLAPSED_LIMIT}` : `Show all ${rows.length}`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

const IMPACT_LABEL: Record<ImpactClass, string> = {
  gene_body: 'gene body',
  cds_disruption: 'CDS',
  promoter: 'promoter',
  upstream: 'upstream',
  cluster_enclosure: 'cluster',
  cnv_support: 'CNV',
  inversion_boundary: 'inv bdy',
  te_associated: 'TE',
};

function ImpactBadge({ impactClass }: { impactClass: ImpactClass }) {
  return (
    <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-1 py-[1px] rounded">
      {IMPACT_LABEL[impactClass] ?? impactClass}
    </span>
  );
}

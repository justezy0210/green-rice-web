import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
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
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-28" />
            <col className="w-20" />
            <col className="w-24" />
            <col className="w-24" />
            <col />
            <col className="w-16" />
          </colgroup>
          <thead>
            <tr className="text-[10px] uppercase tracking-wide text-gray-500 border-b border-gray-200">
              <th className="text-left pl-3 pr-2 py-1">SV</th>
              <th className="text-left px-3 py-1">Type</th>
              <th className="text-left px-3 py-1">Impact</th>
              <th className="text-left px-3 py-1">Cultivar</th>
              <th className="text-left px-3 py-1">Gene</th>
              <th className="text-right pl-3 pr-4 py-1">|ΔAF|</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r, idx) => (
              <tr
                key={`${r.runId}:${r.eventId}:${idx}`}
                className="border-b border-gray-100 hover:bg-green-50"
              >
                <td className="pl-3 pr-2 py-1 font-mono text-[11px] text-gray-800">
                  {r.eventId}
                </td>
                <td className="px-3 py-1 text-[11px] text-gray-600">{r.svType}</td>
                <td className="px-3 py-1 text-[11px]">
                  <ImpactBadge impactClass={r.impactClass} />
                </td>
                <td className="px-3 py-1 text-[11px] text-gray-600">{r.cultivar}</td>
                <td className="px-3 py-1 text-[11px]">
                  {r.geneId ? (
                    <Link
                      to={`/genes/${encodeURIComponent(r.geneId)}`}
                      className="font-mono text-gray-700 hover:text-green-700 hover:underline"
                    >
                      {r.geneId}
                    </Link>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="pl-3 pr-4 py-1 text-right tabular-nums text-gray-800">
                  {typeof r.absDeltaAf === 'number' ? r.absDeltaAf.toFixed(2) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > COLLAPSED_LIMIT && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 text-[11px] text-green-700 hover:underline"
          >
            {expanded ? `Show only ${COLLAPSED_LIMIT}` : `Show all ${rows.length}`}
          </button>
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

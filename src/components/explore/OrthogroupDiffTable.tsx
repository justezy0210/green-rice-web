import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type {
  OrthogroupDiffDocument,
  OrthogroupDiffEntry,
  SelectionMode,
} from '@/types/orthogroup';

interface Props {
  doc: OrthogroupDiffDocument | null;
  isStale: boolean;
}

const INITIAL_LIMIT = 20;

export function OrthogroupDiffTable({ doc, isStale }: Props) {
  const [showAll, setShowAll] = useState(false);

  if (!doc) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-gray-400 text-center">
          No orthogroup differential data. Upload OrthoFinder results in the admin panel.
        </CardContent>
      </Card>
    );
  }

  const groupLabels = doc.groupLabels;
  const rows = showAll ? doc.top : doc.top.slice(0, INITIAL_LIMIT);

  // Guard against legacy documents (pre-MWU schema) that lack selectionMode/thresholds.
  const hasStats = doc.selectionMode !== undefined && doc.thresholds !== undefined;
  const modeBanner = hasStats
    ? describeMode(doc.selectionMode, doc.thresholds.pValue, doc.thresholds.meanDiff)
    : {
        text: 'Legacy data (pre-statistics). Trigger a recompute by re-uploading OrthoFinder files or editing a cultivar.',
        cls: 'bg-amber-50 border-amber-200 text-amber-800',
      };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm">Candidate Orthogroups</CardTitle>
          {hasStats && (
            <span className="text-xs text-gray-500">
              {doc.passedCount.toLocaleString()} nominal hits of {doc.totalTested.toLocaleString()} tested
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className={`text-xs rounded px-3 py-2 border ${modeBanner.cls}`}>
          {modeBanner.text}
        </div>

        {isStale && (
          <div className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded px-3 py-2">
            Grouping has changed since this diff was computed. Recomputation may be in progress.
          </div>
        )}

        {doc.top.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No candidates passed the filter.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="text-left py-1.5 pr-3 font-medium">Orthogroup</th>
                    {groupLabels.map((lbl) => (
                      <th key={lbl} className="text-right py-1.5 px-2 font-medium">
                        {lbl} mean
                      </th>
                    ))}
                    <th className="text-right py-1.5 px-2 font-medium">Δ mean</th>
                    <th className="text-right py-1.5 px-2 font-medium">Δ presence</th>
                    <th
                      className="text-right py-1.5 px-2 font-medium"
                      title="Raw two-sided Mann-Whitney U p-value (unadjusted). Used for ranking."
                    >
                      p-value
                    </th>
                    <th className="text-right py-1.5 px-2 font-medium">log₂ FC</th>
                    <th
                      className="text-left py-1.5 pl-2 font-medium"
                      title="Representative gene from baegilmi GFF3 (temporary)"
                    >
                      Representative*
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((entry) => (
                    <DiffRow key={entry.orthogroup} entry={entry} groupLabels={groupLabels} />
                  ))}
                </tbody>
              </table>
            </div>

            {doc.top.length > INITIAL_LIMIT && !showAll && (
              <button
                onClick={() => setShowAll(true)}
                className="text-xs text-green-700 hover:text-green-800 underline"
              >
                Show all {doc.top.length}
              </button>
            )}
          </>
        )}

        <p className="text-[10px] text-gray-400">
          * Representative gene annotation is a temporary lookup from baegilmi&apos;s GFF3 and will be replaced with proper functional annotation later.
        </p>
      </CardContent>
    </Card>
  );
}

function describeMode(mode: SelectionMode, p: number, minDiff: number): { text: string; cls: string } {
  if (mode === 'strict') {
    return {
      text: `Nominal p < ${p}, |Δ mean| ≥ ${minDiff} (raw p-value, not FDR-corrected)`,
      cls: 'bg-green-50 border-green-200 text-green-700',
    };
  }
  if (mode === 'relaxed') {
    return {
      text: `Relaxed: nominal p < ${p}, |Δ mean| ≥ ${minDiff} (too few hits at p < 0.05)`,
      cls: 'bg-amber-50 border-amber-200 text-amber-800',
    };
  }
  return {
    text: `Fallback: no orthogroups reached p < ${p}. Showing top by p-value — interpret with caution.`,
    cls: 'bg-orange-50 border-orange-200 text-orange-800',
  };
}

function DiffRow({
  entry,
  groupLabels,
}: {
  entry: OrthogroupDiffEntry;
  groupLabels: string[];
}) {
  const rep = entry.representative;
  const primaryAttr = rep ? pickPrimaryAttribute(rep.attributes) : null;
  const hasP = typeof entry.pValue === 'number';
  const pStrong = hasP && entry.pValue < 0.01;

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="py-1 pr-3 font-mono text-gray-900">{entry.orthogroup}</td>
      {groupLabels.map((lbl) => (
        <td key={lbl} className="py-1 px-2 text-right tabular-nums text-gray-700">
          {(entry.meansByGroup[lbl] ?? 0).toFixed(2)}
        </td>
      ))}
      <td className="py-1 px-2 text-right tabular-nums font-medium text-gray-900">
        {entry.meanDiff.toFixed(2)}
      </td>
      <td className="py-1 px-2 text-right tabular-nums text-gray-600">
        {(entry.presenceDiff * 100).toFixed(0)}%
      </td>
      <td className={`py-1 px-2 text-right tabular-nums ${pStrong ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
        {hasP ? formatQ(entry.pValue) : '—'}
      </td>
      <td className="py-1 px-2 text-right tabular-nums text-gray-600">
        {entry.log2FoldChange === null ? '—' : entry.log2FoldChange.toFixed(2)}
      </td>
      <td className="py-1 pl-2 text-gray-600 max-w-xs truncate">
        {rep ? (
          <span title={formatRepresentativeTooltip(rep, primaryAttr)}>
            <span className="text-gray-400 font-mono text-[10px] mr-1">
              {rep.chromosome}:{rep.start.toLocaleString()}-{rep.end.toLocaleString()}
            </span>
            {primaryAttr ?? <span className="text-gray-400 italic">no attr</span>}
          </span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
    </tr>
  );
}

function formatQ(q: number | undefined | null): string {
  if (q === undefined || q === null || Number.isNaN(q)) return '—';
  if (q < 1e-4) return q.toExponential(1);
  return q.toFixed(3);
}

const PRIMARY_ATTR_KEYS = ['Note', 'product', 'Description', 'description', 'function', 'Name'];

function pickPrimaryAttribute(attrs: Record<string, string>): string | null {
  for (const k of PRIMARY_ATTR_KEYS) {
    if (attrs[k]) return decodeURIComponent(attrs[k].replace(/\+/g, ' '));
  }
  const entries = Object.entries(attrs);
  return entries.length > 0 ? `${entries[0][0]}=${entries[0][1]}` : null;
}

function formatRepresentativeTooltip(
  rep: NonNullable<OrthogroupDiffEntry['representative']>,
  primary: string | null,
): string {
  const lines = [
    `Gene: ${rep.geneId}`,
    `Location: ${rep.chromosome}:${rep.start}-${rep.end} (${rep.strand})`,
  ];
  if (primary) lines.push(`Annotation: ${primary}`);
  return lines.join('\n');
}

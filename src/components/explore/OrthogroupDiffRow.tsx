import type { OrthogroupDiffEntry } from '@/types/orthogroup';

interface Props {
  entry: OrthogroupDiffEntry;
  groupLabels: string[];
  hasAf?: boolean;
  maxDeltaAf?: number | null;
  onSelectOg?: (ogId: string) => void;
}

export function OrthogroupDiffRow({ entry, groupLabels, hasAf, maxDeltaAf, onSelectOg }: Props) {
  const rep = entry.representative;
  const primary = rep ? pickPrimaryRepresentative(rep) : null;
  const hasP = typeof entry.pValue === 'number';
  const pStrong = hasP && entry.pValue < 0.01;

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="py-1 pr-3 font-mono text-gray-900">
        <div className="flex items-center gap-1">
          {onSelectOg ? (
            <button
              type="button"
              onClick={() => onSelectOg(entry.orthogroup)}
              className="text-left font-mono text-gray-900 hover:text-green-700 hover:underline focus:outline-none focus:ring-2 focus:ring-green-200 rounded px-1 -mx-1"
            >
              {entry.orthogroup}
            </button>
          ) : (
            entry.orthogroup
          )}
          {hasAf && (
            <span className="text-[9px] text-teal-600" title="Gene-region variant data available">AF</span>
          )}
        </div>
      </td>
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
        {hasP ? formatP(entry.pValue) : '—'}
      </td>
      <td className="py-1 px-2 text-right tabular-nums text-gray-600">
        {entry.log2FoldChange === null ? '—' : entry.log2FoldChange.toFixed(2)}
      </td>
      <td className="py-1 px-2 text-right tabular-nums text-gray-600">
        {maxDeltaAf != null ? maxDeltaAf.toFixed(2) : '—'}
      </td>
      <td className="py-1 pl-2 text-gray-600 max-w-xs truncate">
        {rep && primary ? (
          <span title={formatRepresentativeTooltip(rep)}>
            <span className="text-gray-400 font-mono text-[10px] mr-1">
              {primary.transcript}
            </span>
            {primary.description}
          </span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
    </tr>
  );
}

function formatP(q: number | undefined | null): string {
  if (q === undefined || q === null || Number.isNaN(q)) return '—';
  if (q < 1e-4) return q.toExponential(1);
  return q.toFixed(3);
}

const VAGUE_PATTERNS = /\b(hypothetical|unknown|uncharacterized|expressed protein|conserved hypothetical)\b/i;

/**
 * Pick the most informative IRGSP transcript for table display:
 *   1. Has a description that is NOT "NA" and NOT vague (hypothetical/unknown/…) → best
 *   2. Has a description that is NOT "NA" but vague → fallback
 *   3. All "NA" → show first transcript as-is
 */
function pickPrimaryRepresentative(
  rep: NonNullable<OrthogroupDiffEntry['representative']>,
): { transcript: string; description: string } | null {
  if (!rep.transcripts || rep.transcripts.length === 0) {
    const entries = Object.entries(rep.descriptions ?? {});
    if (entries.length === 0) return null;
    const [tid, desc] = entries[0];
    return { transcript: tid, description: desc };
  }

  let vagueFallback: { transcript: string; description: string } | null = null;

  for (const tid of rep.transcripts) {
    const desc = rep.descriptions?.[tid];
    if (!desc || desc === 'NA') continue;
    if (VAGUE_PATTERNS.test(desc)) {
      if (!vagueFallback) vagueFallback = { transcript: tid, description: desc };
      continue;
    }
    return { transcript: tid, description: desc };
  }

  if (vagueFallback) return vagueFallback;

  const tid = rep.transcripts[0];
  return { transcript: tid, description: rep.descriptions?.[tid] ?? 'NA' };
}

function formatRepresentativeTooltip(
  rep: NonNullable<OrthogroupDiffEntry['representative']>,
): string {
  const lines: string[] = ['IRGSP-1.0 reference transcripts:'];
  for (const tid of rep.transcripts) {
    lines.push(`  ${tid}: ${rep.descriptions?.[tid] ?? 'NA'}`);
  }
  return lines.join('\n');
}

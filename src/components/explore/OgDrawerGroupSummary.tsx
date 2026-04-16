import type { OrthogroupDiffEntry } from '@/types/orthogroup';

function withAlpha(rgba: string, alpha: number): string {
  return rgba.replace(/rgba?\(([^)]+)\)/, (_, inner: string) => {
    const parts = inner.split(',').map((s) => s.trim());
    return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
  });
}

interface Props {
  entry: OrthogroupDiffEntry;
  groupLabels: string[];
  groupColorMap?: Record<string, { bg: string; border: string }>;
}

export function OgDrawerGroupSummary({ entry, groupLabels, groupColorMap }: Props) {
  return (
    <section className="border-b border-gray-100 px-4 py-3 text-xs">
      <h3 className="font-medium text-gray-500 uppercase tracking-wide mb-2">Group summary</h3>
      <div className="space-y-1">
        {groupLabels.map((lbl) => {
          const mean = entry.meansByGroup[lbl] ?? 0;
          const presence = entry.presenceByGroup[lbl] ?? 0;
          const n = entry.cultivarCountsByGroup[lbl] ?? 0;
          const color = groupColorMap?.[lbl];
          return (
            <div key={lbl} className="flex justify-between tabular-nums text-gray-700">
              <span className="font-medium flex items-center gap-1.5">
                {color && (
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-sm border"
                    style={{
                      backgroundColor: withAlpha(color.bg, 0.25),
                      borderColor: withAlpha(color.border, 0.45),
                    }}
                  />
                )}
                {lbl}
              </span>
              <span className="text-gray-500">
                mean {mean.toFixed(2)} · presence {(presence * 100).toFixed(0)}% · n={n}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 text-gray-500 flex justify-between tabular-nums">
        <span>Δ mean: <strong className="text-gray-900">{entry.meanDiff.toFixed(2)}</strong></span>
        <span>p: <strong className="text-gray-900">{formatP(entry.pValue)}</strong></span>
        <span>log₂FC: <strong className="text-gray-900">{entry.log2FoldChange === null ? '—' : entry.log2FoldChange.toFixed(2)}</strong></span>
      </div>
    </section>
  );
}

function formatP(p: number | undefined | null): string {
  if (p == null || Number.isNaN(p)) return '—';
  if (p < 1e-4) return p.toExponential(1);
  return p.toFixed(3);
}

import { useGenomeAverages, extractGenomeValues, GENOME_RADAR_LABELS } from '@/hooks/useGenomeAverages';
import type { GenomeSummary } from '@/types/genome';

function fmt(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + ' Gb';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + ' Mb';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + ' Kb';
  return n.toLocaleString() + ' bp';
}

const GENOME_FORMATTERS: ((v: number) => string)[] = [
  fmt, fmt, (n) => n.toFixed(1) + '%', (n) => n.toLocaleString(), fmt, (n) => n.toFixed(1) + '%',
];

const REPEAT_CLASSES = ['LTR', 'DNA transposon', 'LINE', 'SINE'] as const;

interface Props {
  genomeSummary?: GenomeSummary;
  hoveredIdx: number;
  setHoveredIdx: (i: number) => void;
}

export function GenomeTableSection({ genomeSummary, hoveredIdx, setHoveredIdx }: Props) {
  const { averages } = useGenomeAverages();

  if (!genomeSummary || genomeSummary.status !== 'complete') {
    return <div />;
  }

  const rawValues = extractGenomeValues(genomeSummary);
  const { assembly, repeatAnnotation } = genomeSummary;
  const repeatEntries = REPEAT_CLASSES.map((cls) => [cls, repeatAnnotation.classDistribution[cls] ?? 0] as const);

  return (
    <div>
      <div className="divide-y divide-gray-100">
        {GENOME_RADAR_LABELS.map((label, i) => {
          const val = rawValues[i];
          const avg = averages[i];
          const diff = avg > 0 ? val - avg : null;
          return (
            <div
              key={label}
              className={`flex items-center justify-between gap-3 text-sm px-2 py-1.5 transition-colors ${hoveredIdx === i ? 'ring-1 ring-blue-400 bg-blue-50 rounded-md' : ''}`}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(-1)}
            >
              <span className="text-gray-600 whitespace-nowrap">{label}</span>
              <div className="flex items-center gap-1.5 shrink-0 tabular-nums">
                <span className="font-medium text-gray-900 w-20 text-right">
                  {GENOME_FORMATTERS[i](val)}
                </span>
                {diff !== null && diff !== 0 && (
                  <span className={`flex items-center gap-0.5 text-xs font-medium ${diff > 0 ? 'text-red-500' : 'text-blue-500'}`}>
                    <span className={`inline-block text-[10px] ${diff > 0 ? '' : 'rotate-180'}`}>▲</span>
                    {GENOME_FORMATTERS[i](Math.abs(diff))}
                  </span>
                )}
                {diff !== null && diff === 0 && (
                  <span className="text-xs text-gray-400 w-12">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 pt-3 border-t border-gray-200 divide-y divide-gray-100">
        <div className="flex justify-between text-sm px-2 py-1.5">
          <span className="text-gray-500">Chromosomes</span>
          <span className="font-medium text-gray-900">{assembly.chromosomeCount}</span>
        </div>
        <div className="flex justify-between text-sm px-2 py-1.5">
          <span className="text-gray-500">Scaffolds</span>
          <span className="font-medium text-gray-900">{assembly.scaffoldCount}</span>
        </div>
        <div className="px-2 py-1.5">
          <p className="text-xs text-gray-500 mb-1">Repeat classes</p>
          <div className="divide-y divide-gray-50">
            {repeatEntries.map(([cls, bp]) => (
              <div key={cls} className="flex justify-between text-xs text-gray-600 py-1">
                <span>{cls}</span>
                <span>{bp > 0 ? fmt(bp) : '–'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

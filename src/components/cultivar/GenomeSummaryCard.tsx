import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadarChartWrapper } from '@/components/charts/RadarChartWrapper';
import {
  useGenomeAverages,
  extractGenomeValues,
  GENOME_RADAR_LABELS,
} from '@/hooks/useGenomeAverages';
import type { GenomeSummary } from '@/types/genome';

function fmt(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + ' Gb';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + ' Mb';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + ' Kb';
  return n.toLocaleString() + ' bp';
}

function pct(n: number): string {
  return n.toFixed(1) + '%';
}

const VALUE_FORMATTERS: ((v: number) => string)[] = [
  fmt,           // Total Size
  fmt,           // N50
  pct,           // GC %
  (n) => n.toLocaleString(), // Gene Count
  fmt,           // Avg Gene Length
  pct,           // Repeat %
];

function fmtByIdx(i: number, v: number): string {
  return VALUE_FORMATTERS[i](v);
}

interface Props {
  summary: GenomeSummary;
  cultivarName?: string;
}

export function GenomeSummaryCard({ summary, cultivarName }: Props) {
  if (summary.status === 'pending') {
    return <StatusCard message="Waiting for genome files to be uploaded" />;
  }
  if (summary.status === 'processing') {
    return <StatusCard message="Parsing genome files..." pulse />;
  }
  if (summary.status === 'error') {
    return <StatusCard message={`Parsing error: ${summary.errorMessage}`} error />;
  }

  return <CompleteGenomeSummary summary={summary} cultivarName={cultivarName} />;
}

function CompleteGenomeSummary({ summary, cultivarName }: { summary: GenomeSummary; cultivarName?: string }) {
  const { averages, count } = useGenomeAverages();
  const [hoveredIdx, setHoveredIdx] = useState(-1);
  const onLabelHover = useCallback((i: number) => setHoveredIdx(i), []);

  const rawValues = useMemo(() => extractGenomeValues(summary), [summary]);

  const radarData = useMemo(() => {
    return rawValues.map((v, i) =>
      averages[i] > 0 ? (v / averages[i]) * 100 : 0
    );
  }, [rawValues, averages]);

  const { assembly, repeatAnnotation } = summary;

  const REPEAT_CLASSES = ['LTR', 'DNA transposon', 'LINE', 'SINE'] as const;
  const repeatEntries = REPEAT_CLASSES.map((cls) => [cls, repeatAnnotation.classDistribution[cls] ?? 0] as const);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          Genome Profile
          <span className="ml-2 text-sm font-normal text-gray-500">
            vs. Average (100%){count > 0 && ` — ${count} cultivar${count > 1 ? 's' : ''}`}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 max-w-4xl mx-auto px-6">
          <div className="flex-1 min-w-0">
            <RadarChartWrapper
              labels={GENOME_RADAR_LABELS}
              datasets={[
                {
                  label: 'Average (100%)',
                  data: GENOME_RADAR_LABELS.map(() => 100),
                  backgroundColor: 'rgba(156, 163, 175, 0.1)',
                  borderColor: 'rgba(156, 163, 175, 0.5)',
                  borderDash: [4, 4],
                },
                {
                  label: cultivarName ?? 'This cultivar',
                  data: radarData,
                  backgroundColor: 'rgba(59, 130, 246, 0.15)',
                  borderColor: 'rgba(59, 130, 246, 0.8)',
                },
              ]}
              height={400}
              comparisonData={radarData}
              onLabelHover={onLabelHover}
              activeIndex={hoveredIdx}
            />
          </div>

          <div className="shrink-0 flex flex-col justify-center">
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
                        {fmtByIdx(i, val)}
                      </span>
                      {diff !== null && diff !== 0 && (
                        <span className={`flex items-center gap-0.5 text-xs font-medium ${diff > 0 ? 'text-red-500' : 'text-blue-500'}`}>
                          <span className={`inline-block text-[10px] ${diff > 0 ? '' : 'rotate-180'}`}>▲</span>
                          {fmtByIdx(i, Math.abs(diff))}
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

            <div className="mt-6 pt-4 border-t border-gray-200 divide-y divide-gray-100">
              <DetailRow label="Chromosomes" value={String(assembly.chromosomeCount)} />
              <DetailRow label="Scaffolds" value={String(assembly.scaffoldCount)} />
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
        </div>
      </CardContent>
    </Card>
  );
}

function StatusCard({ message, pulse, error }: { message: string; pulse?: boolean; error?: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Genome</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`flex items-center justify-center h-48 text-sm ${error ? 'text-red-500' : pulse ? 'text-amber-500' : 'text-gray-400'}`}>
          <span className={pulse ? 'animate-pulse' : ''}>{message}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm px-2 py-1.5">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

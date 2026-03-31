import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo, useCallback } from 'react';
import { usePhenotypeData } from '@/hooks/usePhenotypeData';
import { useGenomeSummary } from '@/hooks/useGenomeSummary';
import { useGenomeAverages, extractGenomeValues, GENOME_RADAR_LABELS } from '@/hooks/useGenomeAverages';
import { RadarChartWrapper } from '@/components/charts/RadarChartWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PHENOTYPE_FIELDS, getNumericValue } from '@/lib/utils';
import { cultivarNameToId } from '@/types/cultivar';
import type { PhenotypeRecord } from '@/types/phenotype';
import type { GenomeSummary } from '@/types/genome';

const HEADING_KEYS = ['early', 'normal', 'late'];
const NON_HEADING_FIELDS = PHENOTYPE_FIELDS.filter((f) => f.category !== 'heading');
const RADAR_LABELS = ['Days to Heading (avg)', ...NON_HEADING_FIELDS.map((f) => f.label)];

function headingAvg(r: PhenotypeRecord): number | null {
  const vals = HEADING_KEYS
    .map((k) => getNumericValue(r, k))
    .filter((v): v is number => v !== null);
  return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

function getRadarValues(r: PhenotypeRecord): (number | null)[] {
  return [headingAvg(r), ...NON_HEADING_FIELDS.map((f) => getNumericValue(r, f.key))];
}

function computeAverages(records: PhenotypeRecord[]) {
  const all = records.map(getRadarValues);
  return RADAR_LABELS.map((_, i) => {
    const vals = all.map((row) => row[i]).filter((v): v is number => v !== null);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  });
}

function fmtNum(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

export function CultivarDetailPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { records, loading, error } = usePhenotypeData();

  const decodedName = decodeURIComponent(name ?? '');
  const cultivarId = cultivarNameToId(decodedName);
  const { summary: genomeSummary } = useGenomeSummary(cultivarId);

  const cultivar = records.find(
    (r) => r.cultivar.toLowerCase() === decodedName.toLowerCase()
  );

  const averages = useMemo(() => computeAverages(records), [records]);

  const radarData = useMemo(() => {
    if (!cultivar) return null;
    const vals = getRadarValues(cultivar);
    return vals.map((v, i) =>
      v !== null && averages[i] > 0 ? (v / averages[i]) * 100 : 0
    );
  }, [cultivar, averages]);

  const rawValues = cultivar ? getRadarValues(cultivar) : null;
  const [hoveredIdx, setHoveredIdx] = useState(-1);
  const onLabelHover = useCallback((i: number) => setHoveredIdx(i), []);
  const [genomeHoveredIdx, setGenomeHoveredIdx] = useState(-1);
  const onGenomeLabelHover = useCallback((i: number) => setGenomeHoveredIdx(i), []);

  if (loading === 'loading') {
    return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-64 text-red-500">Error: {error}</div>;
  }

  if (!cultivar || !radarData || !rawValues) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-gray-500">Cultivar "{name}" not found.</p>
        <button onClick={() => navigate(-1)} className="text-sm text-green-600 hover:underline">
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-xl font-bold text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            ←
          </button>
          <h1 className="text-xl font-bold text-gray-900">
            {cultivar.cultivar}
            {cultivar.crossInformation && (
              <span className="ml-2 text-sm font-normal text-gray-400">{cultivar.crossInformation}</span>
            )}
          </h1>
        </div>
        <MiniSearch records={records} onSelect={(n) => navigate(`/cultivar/${encodeURIComponent(n)}`)} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Cultivar Profile
            <span className="ml-2 text-sm font-normal text-gray-500">vs. Average (100%)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-10">
            <div className="hidden lg:block absolute left-1/2 top-[5%] bottom-[5%] w-px bg-gray-200" />
            {/* Phenotype Radar */}
            <div className="order-1 lg:order-none">
              <h3 className="text-sm font-semibold text-gray-500 mb-2 px-2">Phenotype</h3>
              <RadarChartWrapper
                labels={RADAR_LABELS}
                datasets={[
                  {
                    label: 'Average (100%)',
                    data: RADAR_LABELS.map(() => 100),
                    backgroundColor: 'rgba(156, 163, 175, 0.1)',
                    borderColor: 'rgba(156, 163, 175, 0.5)',
                    borderDash: [4, 4],
                  },
                  {
                    label: cultivar.cultivar,
                    data: radarData,
                    backgroundColor: 'rgba(34, 197, 94, 0.15)',
                    borderColor: 'rgba(34, 197, 94, 0.8)',
                  },
                ]}
                height={400}
                comparisonData={radarData}
                onLabelHover={onLabelHover}
                activeIndex={hoveredIdx}
              />
            </div>

            {/* Genome Radar */}
            <div className="order-3 lg:order-none">
              <h3 className="text-sm font-semibold text-gray-500 mb-2 px-2">Genome</h3>
              <GenomeRadarSection genomeSummary={genomeSummary} cultivarName={cultivar.cultivar} onLabelHover={onGenomeLabelHover} activeIndex={genomeHoveredIdx} highlightColor="rgba(96, 165, 250, 0.8)" />
            </div>

            {/* Phenotype Table */}
            <div className="order-2 lg:order-none divide-y divide-gray-100 pt-4 px-18">
              {RADAR_LABELS.map((label, i) => {
                const val = rawValues[i];
                const avg = averages[i];
                const diff = val !== null ? val - avg : null;
                return (
                  <div
                    key={label}
                    className={`flex items-center justify-between gap-3 text-sm px-2 py-1.5 transition-colors ${hoveredIdx === i ? 'ring-1 ring-green-400 bg-green-50 rounded-md' : ''}`}
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(-1)}
                  >
                    <span className="text-gray-600 whitespace-nowrap">{label}</span>
                    <div className="flex items-center gap-1.5 shrink-0 tabular-nums">
                      <span className="font-medium text-gray-900 w-12 text-right">
                        {val !== null ? fmtNum(val) : '–'}
                      </span>
                      {diff !== null && diff !== 0 && (
                        <span className={`flex items-center gap-0.5 text-xs font-medium ${diff > 0 ? 'text-red-500' : 'text-blue-500'}`}>
                          <span className={`inline-block text-[10px] ${diff > 0 ? '' : 'rotate-180'}`}>▲</span>
                          {fmtNum(Math.abs(diff))}
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

            {/* Genome Table */}
            <div className="order-4 lg:order-none pt-4 px-18">
              <GenomeTableSection genomeSummary={genomeSummary} hoveredIdx={genomeHoveredIdx} setHoveredIdx={setGenomeHoveredIdx} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function fmt(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + ' Gb';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + ' Mb';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + ' Kb';
  return n.toLocaleString() + ' bp';
}

function pct(n: number): string {
  return n.toFixed(1) + '%';
}

const GENOME_FORMATTERS: ((v: number) => string)[] = [
  fmt, fmt, pct, (n) => n.toLocaleString(), fmt, pct,
];

function GenomeRadarSection({ genomeSummary, cultivarName, onLabelHover, activeIndex, highlightColor }: { genomeSummary?: GenomeSummary; cultivarName: string; onLabelHover: (i: number) => void; activeIndex: number; highlightColor?: string }) {
  const { averages } = useGenomeAverages();

  if (!genomeSummary || genomeSummary.status !== 'complete') {
    const msg = !genomeSummary ? 'No genome data'
      : genomeSummary.status === 'processing' ? 'Parsing...'
      : genomeSummary.status === 'error' ? 'Parsing error'
      : 'Waiting for upload';
    return (
      <div className="flex items-center justify-center h-[400px] text-sm text-gray-400">
        {msg}
      </div>
    );
  }

  const rawValues = extractGenomeValues(genomeSummary);
  const radarData = rawValues.map((v, i) => averages[i] > 0 ? (v / averages[i]) * 100 : 0);

  return (
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
          label: cultivarName,
          data: radarData,
          backgroundColor: 'rgba(59, 130, 246, 0.15)',
          borderColor: 'rgba(59, 130, 246, 0.8)',
        },
      ]}
      height={400}
      comparisonData={radarData}
      onLabelHover={onLabelHover}
      activeIndex={activeIndex}
      highlightColor={highlightColor}
    />
  );
}

function GenomeTableSection({ genomeSummary, hoveredIdx, setHoveredIdx }: { genomeSummary?: GenomeSummary; hoveredIdx: number; setHoveredIdx: (i: number) => void }) {
  const { averages } = useGenomeAverages();

  if (!genomeSummary || genomeSummary.status !== 'complete') {
    return <div />;
  }

  const rawValues = extractGenomeValues(genomeSummary);
  const { assembly, repeatAnnotation } = genomeSummary;
  const REPEAT_CLASSES = ['LTR', 'DNA transposon', 'LINE', 'SINE'] as const;
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

function MiniSearch({ records, onSelect }: { records: PhenotypeRecord[]; onSelect: (name: string) => void }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(-1);

  const hits = open
    ? records.filter((r) => {
        if (!q.trim()) return true;
        const s = q.toLowerCase();
        return r.cultivar.toLowerCase().includes(s) || (r.crossInformation ?? '').toLowerCase().includes(s);
      })
    : [];

  function pick(name: string) {
    setQ('');
    setOpen(false);
    setIdx(-1);
    // blur to reset focus state so onFocus fires on next click
    (document.activeElement as HTMLElement)?.blur();
    onSelect(name);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (!hits.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => (i + 1) % hits.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => (i <= 0 ? hits.length - 1 : i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); pick((idx >= 0 ? hits[idx] : hits[0]).cultivar); }
    else if (e.key === 'Escape') { setOpen(false); setIdx(-1); }
  }

  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Go to cultivar…"
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setIdx(-1); }}
        onKeyDown={handleKey}
        onFocus={() => { setOpen(true); setIdx(-1); }}
        onBlur={() => { setTimeout(() => setOpen(false), 150); }}
        className="w-72 h-7 rounded border border-gray-300 px-2.5 text-xs shadow-sm focus:border-green-500 focus:ring-1 focus:ring-green-200 outline-none"
      />
      {hits.length > 0 && (
        <ul className="absolute z-20 right-0 w-full mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-48 overflow-y-auto">
          {hits.map((r, i) => (
            <li key={r.cultivar}>
              <button
                className={`w-full text-left px-3 py-1.5 text-xs cursor-pointer flex items-center justify-between ${i === idx ? 'bg-green-100 text-green-800' : 'hover:bg-green-50'}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(r.cultivar)}
              >
                <span>{r.cultivar}</span>
                {r.crossInformation && (
                  <span className="text-gray-400 ml-2 truncate max-w-36">{r.crossInformation}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo, useCallback } from 'react';
import { usePhenotypeData } from '@/hooks/usePhenotypeData';
import { useGenomeSummary } from '@/hooks/useGenomeSummary';
import { RadarChartWrapper } from '@/components/charts/RadarChartWrapper';
import { MiniSearch } from '@/components/cultivar/MiniSearch';
import { GenomeDownloadSection } from '@/components/cultivar/GenomeDownloadSection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PHENOTYPE_FIELDS, getNumericValue } from '@/lib/utils';
import { cultivarNameToId } from '@/lib/cultivar-helpers';
import type { PhenotypeRecord } from '@/types/phenotype';

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
          Go back
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
            Phenotype Profile
            <span className="ml-2 text-sm font-normal text-gray-500">vs. Average (100%)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4 items-center">
            <div>
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
            <PhenotypeTable
              labels={RADAR_LABELS}
              rawValues={rawValues}
              averages={averages}
              hoveredIdx={hoveredIdx}
              setHoveredIdx={setHoveredIdx}
            />
          </div>
        </CardContent>
      </Card>

      <GenomeDownloadSection genomeSummary={genomeSummary} />
    </div>
  );
}

function PhenotypeTable({ labels, rawValues, averages, hoveredIdx, setHoveredIdx }: {
  labels: string[];
  rawValues: (number | null)[];
  averages: number[];
  hoveredIdx: number;
  setHoveredIdx: (i: number) => void;
}) {
  return (
    <div className="divide-y divide-gray-100">
      {labels.map((label, i) => {
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
  );
}

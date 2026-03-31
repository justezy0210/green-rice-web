import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { usePhenotypeData } from '@/hooks/usePhenotypeData';
import { RadarChartWrapper } from '@/components/charts/RadarChartWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PHENOTYPE_FIELDS, getNumericValue } from '@/lib/utils';
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

  const cultivar = records.find(
    (r) => r.cultivar.toLowerCase() === decodeURIComponent(name ?? '').toLowerCase()
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
        <button onClick={() => navigate('/')} className="text-sm text-green-600 hover:underline">
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
            onClick={() => navigate('/')}
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
          <div className="flex gap-8 max-w-4xl mx-auto px-6">
            <div className="flex-1 min-w-0">
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
              />
            </div>
            <div className="shrink-0 flex flex-col justify-center">
              <div className="space-y-2">
                {RADAR_LABELS.map((label, i) => {
                  const val = rawValues[i];
                  const avg = averages[i];
                  const diff = val !== null ? val - avg : null;
                  return (
                    <div key={label} className="flex items-center justify-between gap-3 text-sm">
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
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Genome</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-sm text-gray-400">
            Genome browser will be displayed here
          </div>
        </CardContent>
      </Card>
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

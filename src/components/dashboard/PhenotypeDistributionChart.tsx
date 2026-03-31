import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChartWrapper } from "@/components/charts/BarChartWrapper";
import { DotChartWrapper } from "@/components/charts/DotChartWrapper";
import type { PhenotypeRecord } from "@/types/phenotype";
import { PHENOTYPE_FIELDS, getNumericValue, cn } from "@/lib/utils";

interface PhenotypeDistributionChartProps {
  records: PhenotypeRecord[];
}

const HEADING_SEASONS = [
  { key: "early",  label: "Early",  color: { bg: 'rgba(34, 197, 94, 0.65)',  border: 'rgba(34, 197, 94, 0.9)' },  btnActive: 'bg-green-600 text-white border-green-600',  btnInactive: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' },
  { key: "normal", label: "Normal", color: { bg: 'rgba(251, 191, 36, 0.65)', border: 'rgba(251, 191, 36, 0.9)' }, btnActive: 'bg-amber-500 text-white border-amber-500',   btnInactive: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
  { key: "late",   label: "Late",   color: { bg: 'rgba(59, 130, 246, 0.65)', border: 'rgba(59, 130, 246, 0.9)' }, btnActive: 'bg-blue-600 text-white border-blue-600',      btnInactive: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
];

const TRAIT_OPTIONS = [
  { key: "days_to_heading", label: "Days to Heading", unit: "days", category: "heading" as const },
  ...PHENOTYPE_FIELDS.filter((f) => f.category !== "heading"),
];

// Tailwind color → Chart.js rgba (fill / border)
const CATEGORY_CHART_COLOR: Record<string, { bg: string; border: string }> = {
  heading:    { bg: 'rgba(37, 99, 235, 0.65)',  border: 'rgba(37, 99, 235, 0.9)' },
  morphology: { bg: 'rgba(147, 51, 234, 0.65)', border: 'rgba(147, 51, 234, 0.9)' },
  yield:      { bg: 'rgba(22, 163, 74, 0.65)',  border: 'rgba(22, 163, 74, 0.9)' },
  quality:    { bg: 'rgba(245, 158, 11, 0.65)', border: 'rgba(245, 158, 11, 0.9)' },
  resistance: { bg: 'rgba(220, 38, 38, 0.65)',  border: 'rgba(220, 38, 38, 0.9)' },
};

function traitButtonClass(category: string, isActive: boolean): string {
  if (category === 'heading')
    return isActive
      ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
      : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
  if (category === 'morphology')
    return isActive
      ? 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700'
      : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100';
  if (category === 'yield')
    return isActive
      ? 'bg-green-600 text-white border-green-600 hover:bg-green-700'
      : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100';
  if (category === 'quality')
    return isActive
      ? 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600'
      : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100';
  if (category === 'resistance')
    return isActive
      ? 'bg-red-600 text-white border-red-600 hover:bg-red-700'
      : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100';
  return '';
}

function sortedByValue(records: PhenotypeRecord[], fieldKey: string) {
  const pairs = records.map((r) => ({
    label: r.cultivar,
    value: getNumericValue(r, fieldKey),
  }));
  pairs.sort((a, b) => {
    if (a.value === null && b.value === null) return 0;
    if (a.value === null) return 1;
    if (b.value === null) return -1;
    return b.value - a.value;
  });
  return { labels: pairs.map((p) => p.label), values: pairs.map((p) => p.value) };
}

export function PhenotypeDistributionChart({ records }: PhenotypeDistributionChartProps) {
  const navigate = useNavigate();
  const [selectedKey, setSelectedKey] = useState("days_to_heading");
  const [headingSeason, setHeadingSeason] = useState("early");

  const goToCultivar = (name: string) => navigate(`/cultivar/${encodeURIComponent(name)}`);

  const isHeading = selectedKey === "days_to_heading";
  const activeFieldKey = isHeading ? headingSeason : selectedKey;
  const selectedOption = TRAIT_OPTIONS.find((o) => o.key === selectedKey)!;
  const activeSeason = HEADING_SEASONS.find((s) => s.key === headingSeason)!;
  const color = isHeading ? activeSeason.color : CATEGORY_CHART_COLOR[selectedOption.category];

  const { labels, values } = useMemo(
    () => sortedByValue(records, activeFieldKey),
    [records, activeFieldKey]
  );

  const mean = useMemo(() => {
    const nums = values.filter((v): v is number => v !== null);
    return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : undefined;
  }, [values]);

  // BLB grid용: 저항 개수 내림차순 정렬
  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => (b.bacterialLeafBlight ?? -1) - (a.bacterialLeafBlight ?? -1));
  }, [records]);

  const chartLabel = isHeading
    ? `Days to Heading — ${activeSeason.label} (days)`
    : `${selectedOption.label}${selectedOption.unit ? ` (${selectedOption.unit})` : ""}`;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base mb-3">Phenotype Distribution</CardTitle>
        <div className="flex flex-wrap gap-1.5">
          {TRAIT_OPTIONS.map((o) => {
            const isActive = selectedKey === o.key;
            return (
              <button
                key={o.key}
                onClick={() => setSelectedKey(o.key)}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-md border font-medium transition-colors cursor-pointer",
                  traitButtonClass(o.category, isActive)
                )}
              >
                {o.label}
              </button>
            );
          })}
        </div>

        {isHeading && (
          <div className="flex gap-1 mt-2">
            {HEADING_SEASONS.map((s) => (
              <button
                key={s.key}
                onClick={() => setHeadingSeason(s.key)}
                className={cn(
                  "px-2 py-0.5 text-xs rounded border font-medium transition-colors cursor-pointer",
                  headingSeason === s.key ? s.btnActive : s.btnInactive
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1">
        {isHeading ? (
          <DotChartWrapper
            labels={labels}
            datasets={[{
              label: chartLabel,
              data: values,
              backgroundColor: color.bg,
              borderColor: color.border,
            }]}
            yLabel={selectedOption.unit}
            height={360}
            meanLine={mean}
            onClickLabel={goToCultivar}
          />
        ) : selectedKey === 'bacterialLeafBlight' ? (
          <ResistanceGrid records={sortedRecords} onClickCultivar={goToCultivar} />
        ) : (
          <BarChartWrapper
            labels={labels}
            datasets={[{
              label: chartLabel,
              data: values,
              backgroundColor: color.bg,
            }]}
            yLabel={selectedOption.unit}
            height={360}
            meanLine={mean}
            onClickLabel={goToCultivar}
          />
        )}
      </CardContent>
    </Card>
  );
}

const BLB_STRAINS = ['k1', 'k2', 'k3', 'k3a'] as const;

function ResistanceGrid({ records, onClickCultivar }: { records: PhenotypeRecord[]; onClickCultivar?: (name: string) => void }) {
  return (
    <div>
      <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-green-400 inline-block" /> Resistant
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-red-200 inline-block" /> Susceptible
        </span>
      </div>
      <table className="text-xs border-collapse w-full">
        <thead>
          <tr>
            <th className="text-left pr-4 py-1 text-gray-500 font-medium">Cultivar</th>
            {BLB_STRAINS.map((s) => (
              <th key={s} className="px-2 py-1 text-center text-gray-500 font-medium">{s.toUpperCase()}</th>
            ))}
            <th className="px-2 py-1 text-center text-gray-500 font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => {
            const detail = r.bacterialLeafBlightDetail;
            return (
              <tr key={r.cultivar} className="hover:bg-gray-50">
                <td
                  className="pr-4 py-1 text-gray-700 font-medium whitespace-nowrap hover:text-green-600 cursor-pointer"
                  onClick={() => onClickCultivar?.(r.cultivar)}
                >{r.cultivar}</td>
                {BLB_STRAINS.map((s) => {
                  const val = detail?.[s];
                  return (
                    <td key={s} className="px-2 py-1 text-center">
                      <div
                        className={cn(
                          "w-6 h-6 rounded-sm mx-auto",
                          val === true ? "bg-green-400" : val === false ? "bg-red-200" : "bg-gray-100"
                        )}
                        title={val === true ? "Resistant" : val === false ? "Susceptible" : "Unknown"}
                      />
                    </td>
                  );
                })}
                <td className="px-2 py-1 text-center font-medium text-gray-600">
                  {r.bacterialLeafBlight ?? '–'}<span className="text-gray-400">/4</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

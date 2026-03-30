import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChartWrapper } from "@/components/charts/BarChartWrapper";
import { BoxPlotWrapper } from "@/components/charts/BoxPlotWrapper";
import type { PhenotypeRecord } from "@/types/phenotype";
import { PHENOTYPE_FIELDS, getNumericValue, cn } from "@/lib/utils";

interface PhenotypeDistributionChartProps {
  records: PhenotypeRecord[];
}

const SEASON_GROUPS = [
  { key: "early",  label: "Early Season",  keys: ["earlyseason22",  "earlyseason23"] },
  { key: "normal", label: "Normal Season", keys: ["normalseason23"] },
  { key: "late",   label: "Late Season",   keys: ["lateseason22",   "lateseason23"] },
] as const;

const SEASON_COLORS = [
  { bg: "rgba(34, 197, 94, 0.6)",  border: "rgba(34, 197, 94, 0.9)"  },
  { bg: "rgba(251, 191, 36, 0.6)", border: "rgba(251, 191, 36, 0.9)" },
  { bg: "rgba(59, 130, 246, 0.6)", border: "rgba(59, 130, 246, 0.9)" },
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

export function PhenotypeDistributionChart({ records }: PhenotypeDistributionChartProps) {
  const [selectedKey, setSelectedKey] = useState("days_to_heading");

  const isBoxplot = selectedKey === "days_to_heading";
  const field = PHENOTYPE_FIELDS.find((f) => f.key === selectedKey);
  const selectedOption = TRAIT_OPTIONS.find((o) => o.key === selectedKey)!;
  const color = CATEGORY_CHART_COLOR[selectedOption.category];

  const headingLabels = records.map((r) => r.cultivar);
  const headingDatasets = SEASON_GROUPS.map((sg, i) => ({
    label: sg.label,
    data: records.map((r) =>
      sg.keys.map((k) => getNumericValue(r, k)).filter((v): v is number => v !== null),
    ),
    backgroundColor: SEASON_COLORS[i].bg,
    borderColor: SEASON_COLORS[i].border,
  }));

  const barValues = field ? records.map((r) => getNumericValue(r, field.key)) : [];
  const barLabels = records.map((r) => r.cultivar);

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
      </CardHeader>
      <CardContent className="flex-1">
        {isBoxplot ? (
          <>
            <p className="text-xs text-gray-400 mb-2">
              Box: median · IQR · outliers across cultivars
            </p>
            <BoxPlotWrapper
              labels={headingLabels}
              datasets={headingDatasets}
              yLabel="Days to Heading (days)"
              height={360}
            />
          </>
        ) : (
          <BarChartWrapper
            labels={barLabels}
            datasets={[{
              label: `${selectedOption.label}${selectedOption.unit ? ` (${selectedOption.unit})` : ""}`,
              data: barValues,
              backgroundColor: color.bg,
            }]}
            yLabel={selectedOption.unit}
            height={360}
          />
        )}
      </CardContent>
    </Card>
  );
}

import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChartWrapper } from "@/components/charts/BarChartWrapper";
import { DotChartWrapper } from "@/components/charts/DotChartWrapper";
import { useGroupings } from "@/hooks/useGroupings";
import { ResistanceGrid } from "@/components/dashboard/ResistanceGrid";
import { buildGroupColorMap, traitButtonClass, UNASSIGNED_COLOR } from "@/components/dashboard/distribution-helpers";
import type { PhenotypeRecord } from "@/types/phenotype";
import { FIELD_TO_TRAIT_ID, type PhenotypeFieldKey } from "@/types/grouping";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedKey = searchParams.get("trait") || "days_to_heading";
  const headingSeason = searchParams.get("season") || "early";

  const setSelectedKey = (key: string) => {
    setSearchParams((prev) => { prev.set("trait", key); return prev; }, { replace: true });
  };
  const setHeadingSeason = (season: string) => {
    setSearchParams((prev) => { prev.set("season", season); return prev; }, { replace: true });
  };

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

  // --- Auto-grouping colors ---
  const cultivarNameMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const r of records) m[r.cultivarId] = r.cultivar;
    return m;
  }, [records]);

  const cultivarIdByName = useMemo(() => {
    const m: Record<string, string> = {};
    for (const r of records) m[r.cultivar] = r.cultivarId;
    return m;
  }, [records]);

  const traitId = FIELD_TO_TRAIT_ID[activeFieldKey as PhenotypeFieldKey] ?? null;
  const { assignments, summary } = useGroupings(traitId, cultivarNameMap);

  const groupColorMap = useMemo(() => buildGroupColorMap(assignments), [assignments]);

  const hasGrouping = summary?.method !== 'none' && Object.keys(groupColorMap).length >= 2;

  const perCultivarColors = useMemo<{ bg: string[]; border: string[] } | null>(() => {
    if (!hasGrouping) return null;
    const bg: string[] = [];
    const border: string[] = [];
    for (const name of labels) {
      const cid = cultivarIdByName[name];
      const a = cid ? assignments[cid] : undefined;
      // Borderline cultivars render in gray, not their group color.
      const c = a && !a.borderline
        ? groupColorMap[a.groupLabel] ?? UNASSIGNED_COLOR
        : UNASSIGNED_COLOR;
      bg.push(c.bg);
      border.push(c.border);
    }
    return { bg, border };
  }, [labels, cultivarIdByName, assignments, groupColorMap, hasGrouping]);

  // Map cultivar name → solid color for text/dot display (used by ResistanceGrid).
  // Uses `border` color since `bg` is semi-transparent and too light on white text backgrounds.
  const cultivarNameToColor = useMemo<Record<string, string>>(() => {
    if (!hasGrouping) return {};
    const map: Record<string, string> = {};
    for (const r of records) {
      const a = assignments[r.cultivarId];
      if (!a) continue;
      if (a.borderline) {
        map[r.cultivar] = UNASSIGNED_COLOR.border;
        continue;
      }
      const c = groupColorMap[a.groupLabel];
      if (c) map[r.cultivar] = c.border;
    }
    return map;
  }, [records, assignments, groupColorMap, hasGrouping]);

  const legendItems = useMemo(() => {
    if (!hasGrouping) return [];
    const counts: Record<string, number> = {};
    let borderlineCount = 0;
    for (const a of Object.values(assignments)) {
      if (a.borderline) {
        borderlineCount++;
        continue;
      }
      counts[a.groupLabel] = (counts[a.groupLabel] ?? 0) + 1;
    }
    const items: { label: string; color: string; count: number }[] = Object.entries(
      groupColorMap,
    ).map(([lbl, c]) => ({ label: lbl, color: c.bg, count: counts[lbl] ?? 0 }));
    if (borderlineCount > 0) {
      items.push({ label: 'borderline', color: UNASSIGNED_COLOR.bg, count: borderlineCount });
    }
    return items;
  }, [hasGrouping, groupColorMap, assignments]);

  const methodLabel = useMemo(() => {
    if (!summary) return '';
    if (summary.method === 'gmm') return 'GMM';
    if (summary.method === 'fixed-class') return 'fixed-class';
    return '';
  }, [summary]);

  // Per-group mean lines for GMM groupings on the currently displayed phenotype values.
  // Fixed-class (BLB) groupings skip this since means are not meaningful for binary data.
  const groupMeanLines = useMemo(() => {
    if (!hasGrouping || summary?.method !== 'gmm') return null;

    const byLabel: Record<string, number[]> = {};
    for (let i = 0; i < labels.length; i++) {
      const v = values[i];
      if (v === null) continue;
      const cid = cultivarIdByName[labels[i]];
      const a = cid ? assignments[cid] : undefined;
      if (!a || a.borderline) continue;
      if (!byLabel[a.groupLabel]) byLabel[a.groupLabel] = [];
      byLabel[a.groupLabel].push(v);
    }

    const lines: { value: number; color?: string; label?: string }[] = [];
    for (const [lbl, vs] of Object.entries(byLabel)) {
      if (vs.length === 0) continue;
      const m = vs.reduce((a, b) => a + b, 0) / vs.length;
      const c = groupColorMap[lbl];
      lines.push({
        value: m,
        color: c?.border,
        label: `${lbl} avg ${m.toFixed(1)}`,
      });
    }
    return lines.length > 0 ? lines : null;
  }, [hasGrouping, summary, labels, values, cultivarIdByName, assignments, groupColorMap]);

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
        {legendItems.length > 0 && (
          <div className="flex items-center gap-3 mb-2 text-xs text-gray-600">
            <span className="text-gray-400">
              Auto group{methodLabel ? ` (${methodLabel})` : ''}:
            </span>
            {legendItems.map((it) => (
              <span key={it.label} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: it.color }} />
                {it.label} <span className="text-gray-400">({it.count})</span>
              </span>
            ))}
          </div>
        )}
        {isHeading ? (
          <DotChartWrapper
            labels={labels}
            datasets={[{
              label: chartLabel,
              data: values,
              backgroundColor: perCultivarColors?.bg ?? color.bg,
              borderColor: perCultivarColors?.border ?? color.border,
            }]}
            yLabel={selectedOption.unit}
            height={360}
            meanLine={groupMeanLines ? undefined : mean}
            meanLines={groupMeanLines ?? undefined}
            onClickLabel={goToCultivar}
          />
        ) : selectedKey === 'bacterialLeafBlight' ? (
          <ResistanceGrid
            records={sortedRecords}
            onClickCultivar={goToCultivar}
            cultivarNameToColor={cultivarNameToColor}
          />
        ) : (
          <BarChartWrapper
            labels={labels}
            datasets={[{
              label: chartLabel,
              data: values,
              backgroundColor: perCultivarColors?.bg ?? color.bg,
            }]}
            yLabel={selectedOption.unit}
            height={360}
            meanLine={groupMeanLines ? undefined : mean}
            meanLines={groupMeanLines ?? undefined}
            onClickLabel={goToCultivar}
          />
        )}
      </CardContent>
    </Card>
  );
}

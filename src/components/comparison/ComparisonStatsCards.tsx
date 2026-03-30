import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PhenotypeRecord } from '@/types/phenotype';
import type { ComparisonGroup } from '@/types/common';
import { getNumericValue } from '@/lib/utils';

interface ComparisonStatsCardsProps {
  groups: ComparisonGroup[];
  targetField: string;
  records: PhenotypeRecord[];
}

function computeStats(values: number[]) {
  if (values.length === 0) return { n: 0, mean: '-', median: '-', range: '-' };
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return {
    n: values.length,
    mean: mean.toFixed(2),
    median: median.toFixed(2),
    range: `${sorted[0].toFixed(1)} – ${sorted[sorted.length - 1].toFixed(1)}`,
  };
}

export function ComparisonStatsCards({ groups, targetField, records }: ComparisonStatsCardsProps) {
  const recordMap = Object.fromEntries(records.map((r) => [r.cultivar, r]));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {groups.map((group) => {
        const values = group.cultivars
          .map((c) => recordMap[c] ? getNumericValue(recordMap[c], targetField) : null)
          .filter((v): v is number => v !== null);
        const stats = computeStats(values);

        return (
          <Card key={group.name}>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-semibold text-gray-700">{group.name}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="text-xs text-gray-400">N</div>
                <div className="font-bold text-gray-800">{stats.n}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Mean</div>
                <div className="font-bold text-gray-800">{stats.mean}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Median</div>
                <div className="font-bold text-gray-800">{stats.median}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Range</div>
                <div className="font-bold text-gray-800 text-xs">{stats.range}</div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

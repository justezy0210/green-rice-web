import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChartWrapper } from '@/components/charts/BarChartWrapper';
import type { PhenotypeRecord } from '@/types/phenotype';
import type { ComparisonGroup } from '@/types/common';
import { PHENOTYPE_FIELDS, getNumericValue } from '@/lib/utils';

interface GroupComparisonChartProps {
  groups: ComparisonGroup[];
  targetField: string;
  records: PhenotypeRecord[];
}

const GROUP_COLORS = [
  'rgba(34, 197, 94, 0.7)',
  'rgba(59, 130, 246, 0.7)',
  'rgba(251, 191, 36, 0.7)',
  'rgba(239, 68, 68, 0.7)',
];

export function GroupComparisonChart({ groups, targetField, records }: GroupComparisonChartProps) {
  const field = PHENOTYPE_FIELDS.find((f) => f.key === targetField);
  const recordMap = Object.fromEntries(records.map((r) => [r.cultivar, r]));

  const datasets = groups.map((group, i) => {
    const values = group.cultivars
      .map((c) => recordMap[c] ? getNumericValue(recordMap[c], targetField) : null)
      .filter((v): v is number => v !== null);
    const mean = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    return {
      label: group.name,
      data: [mean], // group mean
      backgroundColor: GROUP_COLORS[i % GROUP_COLORS.length],
    };
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          Mean Comparison by Group — {field?.label ?? targetField}{field?.unit ? ` (${field.unit})` : ''}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <BarChartWrapper
          labels={['Group Mean']}
          datasets={datasets}
          yLabel={field?.unit}
          height={260}
        />
      </CardContent>
    </Card>
  );
}

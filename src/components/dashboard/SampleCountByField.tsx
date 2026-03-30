import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChartWrapper } from '@/components/charts/BarChartWrapper';
import type { PhenotypeDatasetSummary } from '@/types/phenotype';

interface SampleCountByFieldProps {
  summary: PhenotypeDatasetSummary;
}

export function SampleCountByField({ summary }: SampleCountByFieldProps) {
  const labels = summary.fieldSummaries.map((s) => s.field.label);
  const validCounts = summary.fieldSummaries.map((s) => s.validCount);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">표현형별 유효 데이터 수</CardTitle>
      </CardHeader>
      <CardContent>
        <BarChartWrapper
          labels={labels}
          datasets={[{ label: '유효 샘플 수', data: validCounts, backgroundColor: 'rgba(59, 130, 246, 0.7)' }]}
          yLabel="품종 수"
          height={240}
        />
      </CardContent>
    </Card>
  );
}

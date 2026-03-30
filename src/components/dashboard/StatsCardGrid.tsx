import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PhenotypeDatasetSummary } from '@/types/phenotype';

interface StatsCardGridProps {
  summary: PhenotypeDatasetSummary;
}

export function StatsCardGrid({ summary }: StatsCardGridProps) {
  const cards = [
    {
      title: 'Total Cultivars',
      value: summary.totalCultivars.toLocaleString(),
      unit: 'cultivars',
      color: 'text-green-700',
    },
    {
      title: 'Phenotype Traits',
      value: summary.totalFields.toLocaleString(),
      unit: 'traits',
      color: 'text-blue-700',
    },
    {
      title: 'Missing Rate',
      value: `${(summary.missingRate * 100).toFixed(1)}%`,
      unit: '',
      color: summary.missingRate > 0.2 ? 'text-red-600' : 'text-yellow-600',
    },
  ];

  return (
    <>
      {cards.map((card) => (
        <Card key={card.title} className="col-span-2">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-gray-500">{card.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <span className={`text-3xl font-bold ${card.color}`}>{card.value}</span>
            {card.unit && <span className="ml-1 text-sm text-gray-400">{card.unit}</span>}
          </CardContent>
        </Card>
      ))}
    </>
  );
}

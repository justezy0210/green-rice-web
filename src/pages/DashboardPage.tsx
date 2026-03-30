import { usePhenotypeData } from '@/hooks/usePhenotypeData';
import { StatsCardGrid } from '@/components/dashboard/StatsCardGrid';
import { PhenotypeDistributionChart } from '@/components/dashboard/PhenotypeDistributionChart';
import { MissingDataHeatmap } from '@/components/dashboard/MissingDataHeatmap';
import { DownloadButton } from '@/components/data-table/DownloadButton';

export function DashboardPage() {
  const { records, summary, loading, error } = usePhenotypeData();

  if (loading === 'loading') {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Loading...
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        Error loading data: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Summary of Korean rice cultivar phenotype data</p>
        </div>
        <DownloadButton records={records} filename="phenotype_data" />
      </div>

      <div className="grid grid-cols-6 gap-6 items-stretch">
        <StatsCardGrid summary={summary} />
        <div className="col-span-4">
          <PhenotypeDistributionChart records={records} />
        </div>
        <div className="col-span-2">
          <MissingDataHeatmap records={records} />
        </div>
      </div>
    </div>
  );
}

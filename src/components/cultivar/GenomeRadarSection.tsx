import { useGenomeAverages, extractGenomeValues, GENOME_RADAR_LABELS } from '@/hooks/useGenomeAverages';
import { RadarChartWrapper } from '@/components/charts/RadarChartWrapper';
import type { GenomeSummary } from '@/types/genome';

interface Props {
  genomeSummary?: GenomeSummary;
  cultivarName: string;
  onLabelHover: (i: number) => void;
  activeIndex: number;
  highlightColor?: string;
}

export function GenomeRadarSection({ genomeSummary, cultivarName, onLabelHover, activeIndex, highlightColor }: Props) {
  const { averages } = useGenomeAverages();

  if (!genomeSummary || genomeSummary.status !== 'complete') {
    const msg = !genomeSummary ? 'No genome data'
      : genomeSummary.status === 'processing' ? 'Parsing...'
      : genomeSummary.status === 'error' ? 'Parsing error'
      : 'Waiting for upload';
    return (
      <div className="flex items-center justify-center h-[400px] text-sm text-gray-400">
        {msg}
      </div>
    );
  }

  const rawValues = extractGenomeValues(genomeSummary);
  const radarData = rawValues.map((v, i) => averages[i] > 0 ? (v / averages[i]) * 100 : 0);

  return (
    <RadarChartWrapper
      labels={GENOME_RADAR_LABELS}
      datasets={[
        {
          label: 'Average (100%)',
          data: GENOME_RADAR_LABELS.map(() => 100),
          backgroundColor: 'rgba(156, 163, 175, 0.1)',
          borderColor: 'rgba(156, 163, 175, 0.5)',
          borderDash: [4, 4],
        },
        {
          label: cultivarName,
          data: radarData,
          backgroundColor: 'rgba(59, 130, 246, 0.15)',
          borderColor: 'rgba(59, 130, 246, 0.8)',
        },
      ]}
      height={400}
      comparisonData={radarData}
      onLabelHover={onLabelHover}
      activeIndex={activeIndex}
      highlightColor={highlightColor}
    />
  );
}

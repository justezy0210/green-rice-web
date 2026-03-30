import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import {
  BoxPlotController,
  BoxAndWiskers,
} from '@sgratzl/chartjs-chart-boxplot';
import { Chart } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  BoxPlotController,
  BoxAndWiskers
);

interface BoxPlotDataset {
  label: string;
  data: number[][];
  backgroundColor?: string;
  borderColor?: string;
}

interface BoxPlotWrapperProps {
  labels: string[];
  datasets: BoxPlotDataset[];
  title?: string;
  yLabel?: string;
  height?: number;
}

const PALETTE = [
  { bg: 'rgba(34, 197, 94, 0.5)', border: 'rgba(34, 197, 94, 0.9)' },
  { bg: 'rgba(59, 130, 246, 0.5)', border: 'rgba(59, 130, 246, 0.9)' },
  { bg: 'rgba(251, 191, 36, 0.5)', border: 'rgba(251, 191, 36, 0.9)' },
];

export function BoxPlotWrapper({ labels, datasets, title, yLabel, height = 300 }: BoxPlotWrapperProps) {
  const chartData = {
    labels,
    datasets: datasets.map((ds, i) => ({
      type: 'boxplot' as const,
      label: ds.label,
      data: ds.data,
      backgroundColor: ds.backgroundColor ?? PALETTE[i % PALETTE.length].bg,
      borderColor: ds.borderColor ?? PALETTE[i % PALETTE.length].border,
      borderWidth: 1.5,
      outlierBackgroundColor: ds.borderColor ?? PALETTE[i % PALETTE.length].border,
      outlierRadius: 3,
      itemRadius: 2,
      itemStyle: 'circle' as const,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      title: title ? { display: true, text: title, font: { size: 14 } } : { display: false },
    },
    scales: {
      x: {
        ticks: { maxRotation: 45, minRotation: 45, autoSkip: false },
      },
      y: {
        title: { display: !!yLabel, text: yLabel },
      },
    },
  };

  return (
    <div style={{ height }}>
      <Chart type="boxplot" data={chartData} options={options} />
    </div>
  );
}

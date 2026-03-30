import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Title,
} from 'chart.js';
import { Scatter } from 'react-chartjs-2';

ChartJS.register(LinearScale, PointElement, Tooltip, Legend, Title);

interface ScatterPoint {
  x: number;
  y: number;
  label?: string;
}

interface ScatterDataset {
  label: string;
  data: ScatterPoint[];
  backgroundColor?: string;
}

interface ScatterChartWrapperProps {
  datasets: ScatterDataset[];
  title?: string;
  xLabel?: string;
  yLabel?: string;
  height?: number;
}

const PALETTE = [
  'rgba(34, 197, 94, 0.7)',
  'rgba(59, 130, 246, 0.7)',
  'rgba(251, 191, 36, 0.7)',
  'rgba(239, 68, 68, 0.7)',
];

export function ScatterChartWrapper({ datasets, title, xLabel, yLabel, height = 300 }: ScatterChartWrapperProps) {
  const chartData = {
    datasets: datasets.map((ds, i) => ({
      ...ds,
      backgroundColor: ds.backgroundColor ?? PALETTE[i % PALETTE.length],
      pointRadius: 5,
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
      x: { title: { display: !!xLabel, text: xLabel } },
      y: { title: { display: !!yLabel, text: yLabel } },
    },
  };

  return (
    <div style={{ height }}>
      <Scatter data={chartData} options={options} />
    </div>
  );
}

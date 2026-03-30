import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface BarChartWrapperProps {
  labels: string[];
  datasets: {
    label: string;
    data: (number | null)[];
    backgroundColor?: string | string[];
  }[];
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
  'rgba(168, 85, 247, 0.7)',
];

export function BarChartWrapper({ labels, datasets, title, xLabel, yLabel, height = 300 }: BarChartWrapperProps) {
  const chartData = {
    labels,
    datasets: datasets.map((ds, i) => ({
      ...ds,
      backgroundColor: ds.backgroundColor ?? PALETTE[i % PALETTE.length],
      borderRadius: 4,
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
          title: { display: !!xLabel, text: xLabel },
          ticks: { maxRotation: 45, minRotation: 45, autoSkip: false },
        },
      y: { title: { display: !!yLabel, text: yLabel }, beginAtZero: true },
    },
  };

  return (
    <div style={{ height }}>
      <Bar data={chartData} options={options} />
    </div>
  );
}

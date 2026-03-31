import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface RadarDataset {
  label: string;
  data: number[];
  backgroundColor?: string;
  borderColor?: string;
  borderDash?: number[];
}

interface RadarChartWrapperProps {
  labels: string[];
  datasets: RadarDataset[];
  height?: number;
  /** Values to compare against 100% baseline for label coloring */
  comparisonData?: number[];
}

export function RadarChartWrapper({ labels, datasets, height = 360, comparisonData }: RadarChartWrapperProps) {
  const chartData = {
    labels,
    datasets: datasets.map((ds) => ({
      ...ds,
      backgroundColor: ds.backgroundColor ?? 'rgba(34, 197, 94, 0.2)',
      borderColor: ds.borderColor ?? 'rgba(34, 197, 94, 0.8)',
      borderWidth: 2,
      pointRadius: 4,
      pointBackgroundColor: ds.borderColor ?? 'rgba(34, 197, 94, 0.8)',
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        beginAtZero: true,
        ticks: {
          stepSize: 50,
          callback: (value: number | string) => `${value}%`,
          font: { size: 10 },
          backdropColor: 'transparent',
        },
        suggestedMax: 200,
        pointLabels: {
          font: { size: 11, weight: 'bold' as const },
          color: comparisonData
            ? comparisonData.map((v) =>
                v > 100 ? 'rgba(220, 38, 38, 0.8)' : v < 100 ? 'rgba(59, 130, 246, 0.8)' : '#6b7280'
              )
            : '#6b7280',
        },
      },
    },
    plugins: {
      legend: { position: 'top' as const },
      tooltip: {
        callbacks: {
          label: (ctx: { dataset: { label: string }; raw: number }) =>
            `${ctx.dataset.label}: ${ctx.raw.toFixed(0)}%`,
        },
      },
    },
  };

  return (
    <div style={{ height }}>
      <Radar data={chartData} options={options} />
    </div>
  );
}

import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { Bubble } from 'react-chartjs-2';

ChartJS.register(LinearScale, PointElement, Title, Tooltip, Legend, annotationPlugin);

interface DotChartWrapperProps {
  labels: string[];
  datasets: {
    label: string;
    data: (number | null)[];
    backgroundColor?: string;
    borderColor?: string;
  }[];
  yLabel?: string;
  height?: number;
  meanLine?: number;
  onClickLabel?: (label: string) => void;
}

export function DotChartWrapper({ labels, datasets, yLabel, height = 300, meanLine, onClickLabel }: DotChartWrapperProps) {
  const chartData = {
    datasets: datasets.map((ds) => ({
      label: ds.label,
      data: ds.data
        .map((v, i) => (v !== null ? { x: i, y: v, r: 6 } : null))
        .filter(Boolean),
      backgroundColor: ds.backgroundColor ?? 'rgba(37, 99, 235, 0.65)',
      borderColor: ds.borderColor ?? 'rgba(37, 99, 235, 0.9)',
      borderWidth: 1.5,
      hoverRadius: 8,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { raw: { x: number; y: number } }) => {
            const name = labels[ctx.raw.x] ?? '';
            return `${name}: ${ctx.raw.y}`;
          },
        },
      },
      annotation: meanLine != null ? {
        annotations: {
          meanLine: {
            type: 'line' as const,
            yMin: meanLine,
            yMax: meanLine,
            borderColor: 'rgba(220, 38, 38, 0.7)',
            borderWidth: 2,
            borderDash: [6, 4],
            label: {
              display: true,
              content: `avg ${meanLine.toFixed(1)}`,
              position: 'end' as const,
              backgroundColor: 'rgba(220, 38, 38, 0.8)',
              font: { size: 10 },
            },
          },
        },
      } : undefined,
    },
    scales: {
      x: {
        type: 'linear' as const,
        min: -1,
        max: labels.length,
        ticks: {
          stepSize: 1,
          callback: (value: number | string) => {
            const i = typeof value === 'string' ? parseInt(value) : value;
            return labels[i] ?? '';
          },
          maxRotation: 45,
          minRotation: 45,
          autoSkip: false,
        },
      },
      y: {
        title: { display: !!yLabel, text: yLabel },
        beginAtZero: false,
      },
    },
  };

  const handleClick = onClickLabel
    ? (_: unknown, elements: { element: { $context: { raw: { x: number } } } }[]) => {
        if (elements.length > 0) {
          const x = elements[0].element.$context.raw.x;
          onClickLabel(labels[x]);
        }
      }
    : undefined;

  const handleHover = onClickLabel
    ? (event: { native: MouseEvent | null }, elements: unknown[]) => {
        const canvas = event.native?.target as HTMLCanvasElement | null;
        if (canvas) canvas.style.cursor = elements.length > 0 ? 'pointer' : 'default';
      }
    : undefined;

  return (
    <div style={{ height }}>
      <Bubble data={chartData} options={{ ...options, onClick: handleClick, onHover: handleHover }} />
    </div>
  );
}

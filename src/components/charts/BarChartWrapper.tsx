import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type ActiveElement,
  type ChartEvent,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, annotationPlugin);

interface HorizontalLine {
  value: number;
  color?: string;
  label?: string;
}

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
  integerOnly?: boolean;
  meanLine?: number;
  meanLines?: HorizontalLine[];
  onClickLabel?: (label: string) => void;
}

const PALETTE = [
  'rgba(34, 197, 94, 0.7)',
  'rgba(59, 130, 246, 0.7)',
  'rgba(251, 191, 36, 0.7)',
  'rgba(239, 68, 68, 0.7)',
  'rgba(168, 85, 247, 0.7)',
];

export function BarChartWrapper({ labels, datasets, title, xLabel, yLabel, height = 300, integerOnly, meanLine, meanLines, onClickLabel }: BarChartWrapperProps) {
  const lines: HorizontalLine[] = meanLines && meanLines.length > 0
    ? meanLines
    : meanLine != null
    ? [{ value: meanLine, color: 'rgba(220, 38, 38, 0.7)', label: `avg ${meanLine.toFixed(1)}` }]
    : [];
  // y축 최솟값: 데이터 최솟값의 90% (차이가 잘 보이도록)
  const allValues = datasets.flatMap((ds) => ds.data.filter((v): v is number => v !== null));
  const dataMin = allValues.length > 0 ? Math.min(...allValues) : 0;
  const yMin = integerOnly ? 0 : Math.floor(dataMin * 0.9);

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
      annotation: lines.length > 0 ? {
        annotations: Object.fromEntries(
          lines.map((ln, i) => [
            `line_${i}`,
            {
              type: 'line' as const,
              yMin: ln.value,
              yMax: ln.value,
              borderColor: ln.color ?? 'rgba(220, 38, 38, 0.7)',
              borderWidth: 2,
              borderDash: [6, 4],
              label: {
                display: true,
                content: ln.label ?? `${ln.value.toFixed(1)}`,
                position: 'end' as const,
                backgroundColor: ln.color ?? 'rgba(220, 38, 38, 0.8)',
                color: '#fff',
                font: { size: 10 },
              },
            },
          ]),
        ),
      } : undefined,
    },
    scales: {
      x: {
          title: { display: !!xLabel, text: xLabel },
          ticks: { maxRotation: 45, minRotation: 45, autoSkip: false },
        },
      y: {
        title: { display: !!yLabel, text: yLabel },
        min: yMin,
        ...(integerOnly && { ticks: { stepSize: 1 } }),
      },
    },
  };

  const handleClick = onClickLabel
    ? (_: ChartEvent, elements: ActiveElement[]) => {
        if (elements.length > 0) {
          onClickLabel(labels[elements[0].index]);
        }
      }
    : undefined;

  const handleHover = onClickLabel
    ? (event: ChartEvent, elements: ActiveElement[]) => {
        const canvas = event.native?.target as HTMLCanvasElement | null;
        if (canvas) canvas.style.cursor = elements.length > 0 ? 'pointer' : 'default';
      }
    : undefined;

  return (
    <div style={{ height }}>
      <Bar data={chartData} options={{ ...options, onClick: handleClick, onHover: handleHover }} />
    </div>
  );
}

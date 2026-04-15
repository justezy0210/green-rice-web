import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend,
  type ActiveElement,
  type ChartEvent,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { Bubble } from 'react-chartjs-2';

ChartJS.register(LinearScale, PointElement, Title, Tooltip, Legend, annotationPlugin);

interface HorizontalLine {
  value: number;
  color?: string;
  label?: string;
}

interface DotChartWrapperProps {
  labels: string[];
  datasets: {
    label: string;
    data: (number | null)[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
  }[];
  yLabel?: string;
  height?: number;
  meanLine?: number;
  meanLines?: HorizontalLine[];
  onClickLabel?: (label: string) => void;
}

export function DotChartWrapper({ labels, datasets, yLabel, height = 300, meanLine, meanLines, onClickLabel }: DotChartWrapperProps) {
  const lines: HorizontalLine[] = meanLines && meanLines.length > 0
    ? meanLines
    : meanLine != null
    ? [{ value: meanLine, color: 'rgba(220, 38, 38, 0.7)', label: `avg ${meanLine.toFixed(1)}` }]
    : [];
  const chartData = {
    datasets: datasets.map((ds) => {
      const bgArr = Array.isArray(ds.backgroundColor) ? ds.backgroundColor : null;
      const borderArr = Array.isArray(ds.borderColor) ? ds.borderColor : null;

      const points: { x: number; y: number; r: number; _idx: number }[] = [];
      ds.data.forEach((v, i) => {
        if (v !== null) points.push({ x: i, y: v, r: 6, _idx: i });
      });

      return {
        label: ds.label,
        data: points,
        backgroundColor: bgArr
          ? points.map((p) => bgArr[p._idx] ?? 'rgba(37, 99, 235, 0.65)')
          : ds.backgroundColor ?? 'rgba(37, 99, 235, 0.65)',
        borderColor: borderArr
          ? points.map((p) => borderArr[p._idx] ?? 'rgba(37, 99, 235, 0.9)')
          : ds.borderColor ?? 'rgba(37, 99, 235, 0.9)',
        borderWidth: 1.5,
        hoverRadius: 8,
      };
    }),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { raw: unknown }) => {
            const raw = ctx.raw as { x?: number; y?: number } | null;
            if (!raw || typeof raw.x !== 'number' || typeof raw.y !== 'number') return '';
            const name = labels[raw.x] ?? '';
            return `${name}: ${raw.y}`;
          },
        },
      },
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
    ? (_: ChartEvent, elements: ActiveElement[]) => {
        if (elements.length === 0) return;
        const raw = (elements[0].element as unknown as { $context?: { raw?: { x?: number } } })
          .$context?.raw;
        if (raw && typeof raw.x === 'number') {
          onClickLabel(labels[raw.x]);
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
      <Bubble data={chartData} options={{ ...options, onClick: handleClick, onHover: handleHover }} />
    </div>
  );
}

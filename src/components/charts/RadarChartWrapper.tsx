import { useRef, useCallback, useEffect, useMemo } from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import type { ChartEvent, Plugin } from 'chart.js';
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
  /** Called with label index on hover, -1 when leaving */
  onLabelHover?: (index: number) => void;
  /** Index of the label to highlight with a border (-1 = none) */
  activeIndex?: number;
  /** Color of the highlight border around active label */
  highlightColor?: string;
}

export function RadarChartWrapper({ labels, datasets, height = 360, comparisonData, onLabelHover, activeIndex = -1, highlightColor = 'rgba(74, 222, 128, 0.8)' }: RadarChartWrapperProps) {
  const lastIndex = useRef(-1);
  const chartRef = useRef<ChartJS<'radar'> | null>(null);
  const activeIndexRef = useRef(activeIndex);
  const highlightColorRef = useRef(highlightColor);

  // Keep refs in sync with props so the Chart.js plugin closure reads
  // current values without being re-created. Must be in an effect — writing
  // to refs during render is flagged by react-hooks/refs-during-render.
  useEffect(() => {
    activeIndexRef.current = activeIndex;
    highlightColorRef.current = highlightColor;
    chartRef.current?.draw();
  }, [activeIndex, highlightColor]);

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

  const handleHover = useCallback(
    (event: ChartEvent) => {
      if (!onLabelHover || !event.native) return;
      const nativeEvent = event.native as MouseEvent;
      const canvas = nativeEvent.target as HTMLCanvasElement;
      const chart = ChartJS.getChart(canvas);
      if (!chart) return;

      const scale = chart.scales.r as RadialLinearScale & {
        _pointLabelItems?: { left: number; right: number; top: number; bottom: number }[];
      };
      const items = scale._pointLabelItems;
      if (!items) return;

      const rect = canvas.getBoundingClientRect();
      const mx = nativeEvent.clientX - rect.left;
      const my = nativeEvent.clientY - rect.top;
      const pad = 8;

      let found = -1;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (mx >= it.left - pad && mx <= it.right + pad && my >= it.top - pad && my <= it.bottom + pad) {
          found = i;
          break;
        }
      }

      canvas.style.cursor = found >= 0 ? 'pointer' : 'default';

      if (found !== lastIndex.current) {
        lastIndex.current = found;
        onLabelHover(found);
      }
    },
    [onLabelHover],
  );

  const handleLeave = useCallback(() => {
    if (!onLabelHover) return;
    if (lastIndex.current !== -1) {
      lastIndex.current = -1;
      onLabelHover(-1);
    }
  }, [onLabelHover]);

  const highlightPlugin = useMemo<Plugin<'radar'>>(
    () => ({
      id: 'labelHighlight',
      afterDraw(chart) {
        const idx = activeIndexRef.current;
        if (idx < 0) return;
        const scale = chart.scales.r as RadialLinearScale & {
          _pointLabelItems?: { left: number; right: number; top: number; bottom: number }[];
        };
        const items = scale._pointLabelItems;
        if (!items || !items[idx]) return;

        const it = items[idx];
        const ctx = chart.ctx;
        const pad = 4;
        const x = it.left - pad;
        const y = it.top - pad;
        const w = it.right - it.left + pad * 2;
        const h = it.bottom - it.top + pad * 2;

        ctx.save();
        ctx.strokeStyle = highlightColorRef.current;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 4);
        ctx.stroke();
        ctx.restore();
      },
    }),
    [],
  );

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { bottom: 12 } },
    onHover: handleHover,
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
            ? (ctx: { index: number }) => {
                const v = comparisonData[ctx.index];
                return v > 100 ? 'rgba(220, 38, 38, 0.8)' : v < 100 ? 'rgba(59, 130, 246, 0.8)' : '#6b7280';
              }
            : '#6b7280',
        },
      },
    },
    plugins: {
      legend: { position: 'top' as const },
      tooltip: {
        callbacks: {
          label: (ctx: { dataset: { label?: string }; raw: unknown }) => {
            const label = ctx.dataset.label ?? '';
            const raw = typeof ctx.raw === 'number' ? ctx.raw : 0;
            return `${label}: ${raw.toFixed(0)}%`;
          },
        },
      },
    },
  };

  return (
    <div style={{ height, paddingBottom: 16 }} onMouseLeave={handleLeave}>
      <Radar ref={chartRef} data={chartData} options={options} plugins={[highlightPlugin]} />
    </div>
  );
}

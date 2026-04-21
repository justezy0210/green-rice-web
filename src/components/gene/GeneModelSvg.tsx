import { useMemo } from 'react';
import {
  computeGeneModelGeometry,
  EXON_COLORS,
  exonHeight,
  exonY,
} from '@/lib/gene-model';
import type { GeneModelEntry } from '@/types/gene-model';

interface Props {
  gene: GeneModelEntry;
  width?: number;
  height?: number;
  variants?: { pos: number; label?: string }[];
}

export function GeneModelSvg({
  gene,
  width = 720,
  height = 44,
  variants = [],
}: Props) {
  const geom = useMemo(
    () => computeGeneModelGeometry(gene, width, height),
    [gene, width, height],
  );

  const span = gene.end - gene.start;
  const variantTicks = variants
    .filter((v) => v.pos >= gene.start && v.pos <= gene.end)
    .map((v) => {
      const norm = (v.pos - gene.start) / span;
      const frac = geom.strand === '-' ? 1 - norm : norm;
      return { x: frac * width, ...v };
    });

  return (
    <svg
      viewBox={`0 0 ${width} ${height + 14}`}
      className="w-full h-auto"
      role="img"
      aria-label={`Gene model for ${gene.transcript.id}`}
    >
      {/* strand indicator + coords */}
      <text
        x={0}
        y={10}
        fontSize={10}
        fill="#6b7280"
        fontFamily="ui-monospace, monospace"
      >
        {gene.chr}:{gene.start.toLocaleString()} · {gene.strand} ·{' '}
        {(gene.end - gene.start).toLocaleString()} bp
      </text>

      {/* intron backbone (drawn first so exons cover it) */}
      {geom.intronLines.map((line, i) => (
        <g key={`intron-${i}`}>
          <line
            x1={line.x1}
            x2={line.x2}
            y1={line.y + 14}
            y2={line.y + 14}
            stroke="#d1d5db"
            strokeWidth={1}
          />
          {/* chevron mid-intron indicating strand */}
          {line.x2 - line.x1 > 24 && (
            <polyline
              points={chevronPoints(
                (line.x1 + line.x2) / 2,
                line.y + 14,
                geom.strand,
              )}
              stroke="#9ca3af"
              strokeWidth={1}
              fill="none"
            />
          )}
        </g>
      ))}

      {/* exon boxes */}
      {geom.exonBoxes.map((box, i) => (
        <rect
          key={`exon-${i}`}
          x={box.x}
          y={exonY(box, geom.trackY) + 14}
          width={box.width}
          height={exonHeight(box.type)}
          fill={EXON_COLORS[box.type]}
          stroke="rgba(0,0,0,0.1)"
          strokeWidth={0.5}
        >
          <title>
            {box.type} · {box.start.toLocaleString()}-{box.end.toLocaleString()}
          </title>
        </rect>
      ))}

      {/* variant overlays */}
      {variantTicks.map((t, i) => (
        <g key={`v-${i}`}>
          <line
            x1={t.x}
            x2={t.x}
            y1={0 + 14}
            y2={height + 14}
            stroke="#ef4444"
            strokeWidth={1}
            opacity={0.7}
          >
            <title>{t.label ?? `variant @ ${t.pos.toLocaleString()}`}</title>
          </line>
          <circle cx={t.x} cy={2 + 14} r={2.5} fill="#ef4444">
            <title>{t.label ?? `variant @ ${t.pos.toLocaleString()}`}</title>
          </circle>
        </g>
      ))}
    </svg>
  );
}

function chevronPoints(cx: number, cy: number, strand: '+' | '-'): string {
  // Forward-looking chevron: ›   Reverse: ‹
  const dx = strand === '+' ? 3 : -3;
  const dy = 2;
  return `${cx - dx},${cy - dy} ${cx + dx},${cy} ${cx - dx},${cy + dy}`;
}

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import type { RegionGene } from '@/lib/region-helpers';
import type { SvEvent, SvType } from '@/types/sv-event';

interface Props {
  chr: string;
  start: number;
  end: number;
  genes: RegionGene[];
  svEvents: SvEvent[];
  svLoading?: boolean;
}

const WIDTH = 960;
const MARGIN_LEFT = 8;
const MARGIN_RIGHT = 12;
const RULER_Y = 14;
const GENE_TRACK_Y = 32;
const GENE_BAR_H = 10;
const SV_TRACK_Y = 72;
const SV_BAR_H = 18;

const SV_COLOR: Record<SvType, string> = {
  INS: '#0f766e',
  DEL: '#b91c1c',
  COMPLEX: '#7c3aed',
};

/**
 * Coordinate-scaled SVG viz for the Region page: ruler on top, gene
 * bars in the middle (green if OG-assigned, grey if orphan), SV
 * density strokes below (short tick colored by SV type).
 *
 * Intentionally library-free. No d3, no igv.js — the region view is
 * already heavy, and we want paint to be deterministic and fast.
 * Tooltips on gene bars link to the gene detail page when clicked.
 */
export function RegionTrackViz({ chr, start, end, genes, svEvents, svLoading }: Props) {
  const plotWidth = WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
  const span = Math.max(1, end - start);
  const [hover, setHover] = useState<RegionGene | null>(null);

  const xOf = useMemo(
    () => (pos: number) => MARGIN_LEFT + ((pos - start) / span) * plotWidth,
    [plotWidth, span, start],
  );

  const ticks = useMemo(() => buildTicks(start, end), [start, end]);
  const geneCount = genes.length;
  const svCount = svEvents.length;

  const totalHeight = SV_TRACK_Y + SV_BAR_H + 20;

  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="text-xs uppercase tracking-wide text-gray-500">
            Region track
          </h3>
          <span className="text-[10px] text-gray-400 font-mono">
            {chr}:{(start / 1_000_000).toFixed(2)}–{(end / 1_000_000).toFixed(2)} Mb
            · {geneCount} genes
            · {svLoading ? '…' : svCount} SV
          </span>
        </div>
        <svg
          width="100%"
          viewBox={`0 0 ${WIDTH} ${totalHeight}`}
          role="img"
          aria-label={`Region track ${chr}:${start}-${end}`}
          preserveAspectRatio="none"
        >
          {/* Ruler baseline */}
          <line
            x1={MARGIN_LEFT}
            x2={WIDTH - MARGIN_RIGHT}
            y1={RULER_Y}
            y2={RULER_Y}
            stroke="#9ca3af"
            strokeWidth={0.5}
          />
          {ticks.map((t) => (
            <g key={t.pos}>
              <line
                x1={xOf(t.pos)}
                x2={xOf(t.pos)}
                y1={RULER_Y - 3}
                y2={RULER_Y + 3}
                stroke="#9ca3af"
                strokeWidth={0.5}
              />
              <text
                x={xOf(t.pos)}
                y={RULER_Y - 4}
                fontSize={8}
                textAnchor="middle"
                fill="#6b7280"
              >
                {t.label}
              </text>
            </g>
          ))}

          {/* Gene track label */}
          <text x={MARGIN_LEFT} y={GENE_TRACK_Y - 2} fontSize={8} fill="#6b7280">
            genes
          </text>
          {genes.map((g) => {
            const x1 = xOf(g.start);
            const x2 = xOf(g.end);
            const w = Math.max(1, x2 - x1);
            return (
              <rect
                key={g.id}
                x={x1}
                y={GENE_TRACK_Y}
                width={w}
                height={GENE_BAR_H}
                fill={g.ogId ? '#16a34a' : '#9ca3af'}
                opacity={0.7}
                onMouseEnter={() => setHover(g)}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: 'pointer' }}
              />
            );
          })}

          {/* SV track label */}
          <text x={MARGIN_LEFT} y={SV_TRACK_Y - 2} fontSize={8} fill="#6b7280">
            SV events
          </text>
          {svEvents.map((ev) => (
            <line
              key={ev.eventId}
              x1={xOf(ev.pos)}
              x2={xOf(ev.pos)}
              y1={SV_TRACK_Y}
              y2={SV_TRACK_Y + SV_BAR_H}
              stroke={SV_COLOR[ev.svType] ?? '#6b7280'}
              strokeWidth={1}
              opacity={0.8}
            >
              <title>
                {ev.eventId} · {ev.svType} · {ev.chr}:{ev.pos.toLocaleString()}
              </title>
            </line>
          ))}
        </svg>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[10px] text-gray-500">
          <LegendSwatch color="#16a34a" label="gene (OG-assigned)" />
          <LegendSwatch color="#9ca3af" label="gene (no OG)" />
          <LegendSwatch color={SV_COLOR.INS} label="INS" />
          <LegendSwatch color={SV_COLOR.DEL} label="DEL" />
          <LegendSwatch color={SV_COLOR.COMPLEX} label="COMPLEX" />
        </div>
        {hover && (
          <div className="mt-1 text-[11px] text-gray-700 leading-tight">
            <Link
              to={`/genes/${encodeURIComponent(hover.id)}`}
              className="font-mono text-gray-900 hover:text-green-700 hover:underline"
            >
              {hover.id}
            </Link>
            {hover.ogId && (
              <Link
                to={`/og/${encodeURIComponent(hover.ogId)}`}
                className="ml-2 text-[10px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-1 py-[1px] rounded hover:bg-indigo-100"
              >
                {hover.ogId}
              </Link>
            )}
            <span className="ml-2 text-gray-500 font-mono">
              {hover.chr}:{hover.start.toLocaleString()}-{hover.end.toLocaleString()} ({hover.strand})
            </span>
            {hover.annotation?.product && (
              <span className="ml-2 text-gray-600">· {hover.annotation.product}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="inline-block"
        style={{ width: 10, height: 8, background: color, borderRadius: 2 }}
      />
      <span>{label}</span>
    </span>
  );
}

interface Tick {
  pos: number;
  label: string;
}

function buildTicks(start: number, end: number): Tick[] {
  const span = end - start;
  const targetCount = 6;
  const rawStep = span / targetCount;
  const step = pickRoundStep(rawStep);
  const first = Math.ceil(start / step) * step;
  const ticks: Tick[] = [];
  for (let p = first; p <= end; p += step) {
    ticks.push({ pos: p, label: formatTickLabel(p) });
    if (ticks.length > 40) break;
  }
  return ticks;
}

function pickRoundStep(raw: number): number {
  const mag = 10 ** Math.floor(Math.log10(raw));
  const candidates = [1, 2, 5, 10];
  for (const c of candidates) {
    if (c * mag >= raw) return c * mag;
  }
  return 10 * mag;
}

function formatTickLabel(pos: number): string {
  if (pos >= 1_000_000) return `${(pos / 1_000_000).toFixed(1)}M`;
  if (pos >= 1_000) return `${(pos / 1_000).toFixed(0)}k`;
  return `${pos}`;
}

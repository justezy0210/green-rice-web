import { useMemo } from 'react';
import {
  computeGeneModelGeometry,
  EXON_COLORS,
  exonHeight,
  exonY,
} from '@/lib/gene-model';
import type { GeneModelEntry } from '@/types/gene-model';
import type { SvType } from '@/types/sv-event';

export interface GeneSvOverlay {
  eventId: string;
  /** Sample-frame position in the cultivar's assembly. */
  pos: number;
  /** Sample-frame REF length — used for DEL / COMPLEX extent. */
  refLen: number;
  /** Canonical ALT length — used for INS caret height. */
  altLen: number;
  svType: SvType;
}

const SV_FILL: Record<SvType, string> = {
  INS: '#0f766e',
  DEL: '#b91c1c',
  COMPLEX: '#7c3aed',
};

interface Props {
  gene: GeneModelEntry;
  width?: number;
  height?: number;
  variants?: { pos: number; label?: string }[];
  /** SV events whose sample-frame `pos` falls within [gene.start, gene.end]. */
  svEvents?: GeneSvOverlay[];
}

export function GeneModelSvg({
  gene,
  width = 720,
  height = 44,
  variants = [],
  svEvents = [],
}: Props) {
  const geom = useMemo(
    () => computeGeneModelGeometry(gene, width, height),
    [gene, width, height],
  );

  const span = gene.end - gene.start;
  const bpToX = (pos: number): number => {
    const clamped = Math.max(gene.start, Math.min(gene.end, pos));
    const norm = (clamped - gene.start) / span;
    const frac = geom.strand === '-' ? 1 - norm : norm;
    return frac * width;
  };
  const variantTicks = variants
    .filter((v) => v.pos >= gene.start && v.pos <= gene.end)
    .map((v) => ({ x: bpToX(v.pos), ...v }));
  // Span overlap, not point containment — a large DEL/COMPLEX that
  // starts upstream of the gene but extends into the gene body is
  // biologically interesting and must render. Upstream ranges clamp
  // to the gene window via `bpToX`'s internal clamp.
  const svGlyphs = svEvents
    .filter((e) => e.pos + Math.max(1, e.refLen) >= gene.start && e.pos <= gene.end)
    .map((e) => {
      const xStart = bpToX(e.pos);
      const xEnd = bpToX(e.pos + e.refLen);
      return {
        ev: e,
        x1: Math.min(xStart, xEnd),
        x2: Math.max(xStart, xEnd),
      };
    });

  // SV glyphs render in a dedicated lane below the gene body so they
  // never obscure exon structure. 4 px gap between gene body and
  // SV lane; 14 px lane height fits caret/diamond/span comfortably.
  const SV_GAP = 4;
  const SV_LANE_H = 14;
  const svLaneTop = 14 + height + SV_GAP;
  const svLaneBottom = svLaneTop + SV_LANE_H;
  const svLaneMid = (svLaneTop + svLaneBottom) / 2;
  const totalSvgH = svGlyphs.length > 0 ? svLaneBottom + 2 : height + 14;

  return (
    <svg
      viewBox={`0 0 ${width} ${totalSvgH}`}
      className="w-full h-auto"
      role="img"
      aria-label={`Gene model for ${gene.transcript.id}`}
    >
      <defs>
        <pattern
          id="gene-complex-hatch"
          patternUnits="userSpaceOnUse"
          width={4}
          height={4}
          patternTransform="rotate(45)"
        >
          <line x1={0} y1={0} x2={0} y2={4} stroke={SV_FILL.COMPLEX} strokeWidth={0.8} opacity={0.7} />
        </pattern>
      </defs>
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

      {/* SV glyph overlays in the sample's own assembly frame.
          `pos` and `refLen` come from the per-cultivar side-table
          (sample-frame); canonical `svType` and `altLen` come from
          the reference-frame event. Rendering rules follow the
          biology of what the sample actually has at this locus:
          - INS (canonical): sample carries the long allele, so the
            sample assembly has `refLen_sample` bp of novel sequence
            here → hollow teal span over pos..pos+refLen_sample.
          - DEL (canonical): sample carries the short allele, so the
            sample lacks `altLen_canonical` bp that other cultivars
            have → red diamond/triangle point marker at pos.
          - COMPLEX (canonical): both alleles have real length, the
            sample's own allele is `refLen_sample` bp → purple
            hatched span over pos..pos+refLen_sample.
          Tooltips surface both sample-frame and canonical lengths so
          the frame switch is explicit. */}
      {svGlyphs.length > 0 && (
        <text
          x={0}
          y={svLaneTop - 2}
          fontSize={8}
          fill="#6b7280"
          fontFamily="ui-monospace, monospace"
        >
          SV
        </text>
      )}
      {svGlyphs.map(({ ev, x1, x2 }) => {
        if (ev.svType === 'INS') {
          const w = Math.max(2, x2 - x1);
          return (
            <rect
              key={`sv-${ev.eventId}`}
              x={x1}
              y={svLaneTop}
              width={w}
              height={SV_LANE_H}
              fill={SV_FILL.INS}
              fillOpacity={0.25}
              stroke={SV_FILL.INS}
              strokeWidth={1.5}
            >
              <title>
                {ev.eventId} · INS · sample carries{' '}
                {formatBp(ev.refLen)} of novel sequence here (absent
                in IRGSP reference, canonical alt {formatBp(ev.altLen)})
              </title>
            </rect>
          );
        }
        if (ev.svType === 'DEL') {
          const size = 5;
          const points = `${x1},${svLaneMid - size} ${x1 + size},${svLaneMid} ${x1},${svLaneMid + size} ${x1 - size},${svLaneMid}`;
          return (
            <g key={`sv-${ev.eventId}`}>
              <line
                x1={x1}
                x2={x1}
                y1={svLaneTop}
                y2={svLaneBottom}
                stroke={SV_FILL.DEL}
                strokeWidth={1.5}
                strokeDasharray="3,2"
              />
              <polygon points={points} fill={SV_FILL.DEL}>
                <title>
                  {ev.eventId} · DEL · breakpoint (sample lacks{' '}
                  {formatBp(ev.altLen)} present in other cultivars;
                  sample anchor {formatBp(ev.refLen)})
                </title>
              </polygon>
            </g>
          );
        }
        // COMPLEX
        const w = Math.max(2, x2 - x1);
        return (
          <rect
            key={`sv-${ev.eventId}`}
            x={x1}
            y={svLaneTop}
            width={w}
            height={SV_LANE_H}
            fill="url(#gene-complex-hatch)"
            stroke={SV_FILL.COMPLEX}
            strokeWidth={1.5}
          >
            <title>
              {ev.eventId} · COMPLEX · sample's allele{' '}
              {formatBp(ev.refLen)} vs canonical alt{' '}
              {formatBp(ev.altLen)} (region rearranged)
            </title>
          </rect>
        );
      })}

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

function formatBp(bp: number): string {
  if (bp >= 1_000_000) return `${(bp / 1_000_000).toFixed(1)} Mb`;
  if (bp >= 1_000) return `${Math.round(bp / 1_000)} kb`;
  return `${bp} bp`;
}

function chevronPoints(cx: number, cy: number, strand: '+' | '-'): string {
  // Forward-looking chevron: ›   Reverse: ‹
  const dx = strand === '+' ? 3 : -3;
  const dy = 2;
  return `${cx - dx},${cy - dy} ${cx + dx},${cy} ${cx - dx},${cy + dy}`;
}

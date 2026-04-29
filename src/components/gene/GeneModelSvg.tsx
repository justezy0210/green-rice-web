import { useMemo } from 'react';
import {
  computeGeneModelGeometry,
  EXON_COLORS,
  exonHeight,
  exonY,
} from '@/lib/gene-model';
import { impactClassLabel } from '@/lib/impact-class-label';
import {
  DEL_BREAKPOINT_BP,
  type GeneContextBand,
  type GeneContextImpactClass,
} from '@/lib/gene-context-window';
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
  impactClass?: GeneContextImpactClass | null;
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
  viewStart?: number;
  viewEnd?: number;
  contextBands?: GeneContextBand[];
  linkedEventId?: string | null;
  variants?: { pos: number; label?: string }[];
  /** SV events whose sample-frame footprint falls within the displayed view. */
  svEvents?: GeneSvOverlay[];
}

export function GeneModelSvg({
  gene,
  width = 720,
  height = 44,
  viewStart = gene.start,
  viewEnd = gene.end,
  contextBands = [],
  linkedEventId = null,
  variants = [],
  svEvents = [],
}: Props) {
  const geom = useMemo(
    () => computeGeneModelGeometry(gene, width, height, viewStart, viewEnd),
    [gene, width, height, viewStart, viewEnd],
  );

  const span = geom.viewEnd - geom.viewStart;
  const bpToX = (pos: number): number => {
    const clamped = Math.max(geom.viewStart, Math.min(geom.viewEnd, pos));
    const norm = (clamped - geom.viewStart) / span;
    const frac = geom.strand === '-' ? 1 - norm : norm;
    return frac * width;
  };
  const variantTicks = variants
    .filter((v) => v.pos >= geom.viewStart && v.pos <= geom.viewEnd)
    .map((v) => ({ x: bpToX(v.pos), ...v }));
  const svGlyphs = svEvents
    .filter((e) => {
      const start = e.svType === 'DEL' ? e.pos - DEL_BREAKPOINT_BP : e.pos;
      const end =
        e.svType === 'DEL'
          ? e.pos + DEL_BREAKPOINT_BP
          : e.pos + Math.max(1, e.refLen);
      return end >= geom.viewStart && start <= geom.viewEnd;
    })
    .map((e) => {
      const xStart = bpToX(e.pos);
      const xEnd = bpToX(e.pos + e.refLen);
      return {
        ev: e,
        x1: Math.min(xStart, xEnd),
        x2: Math.max(xStart, xEnd),
      };
    });
  const bandGlyphs = contextBands.map((band) => {
    const xStart = bpToX(band.start);
    const xEnd = bpToX(band.end);
    return {
      band,
      x1: Math.min(xStart, xEnd),
      x2: Math.max(xStart, xEnd),
    };
  });

  // SV glyphs render in a dedicated lane below the gene body so they
  // never obscure exon structure. 4 px gap between gene body and
  // SV lane; 14 px lane height fits caret/diamond/span comfortably.
  const TRACK_OFFSET = contextBands.length > 0 ? 32 : 14;
  const SV_GAP = 4;
  const SV_LANE_H = 14;
  const svLaneTop = TRACK_OFFSET + height + SV_GAP;
  const svLaneBottom = svLaneTop + SV_LANE_H;
  const svLaneMid = (svLaneTop + svLaneBottom) / 2;
  const totalSvgH = svGlyphs.length > 0 ? svLaneBottom + 2 : TRACK_OFFSET + height;

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
        {gene.chr}:{geom.viewStart.toLocaleString()}-{geom.viewEnd.toLocaleString()} ·{' '}
        {gene.strand} ·{' '}
        {(geom.viewEnd - geom.viewStart).toLocaleString()} bp
      </text>

      {bandGlyphs.length > 0 && (
        <g>
          {bandGlyphs.map(({ band, x1, x2 }) => {
            const w = Math.max(1, x2 - x1);
            return (
              <g key={band.key}>
                <rect
                  x={x1}
                  y={16}
                  width={w}
                  height={9}
                  fill={bandFill(band.key)}
                  stroke="#e5e7eb"
                  strokeWidth={0.5}
                >
                  <title>
                    {band.label} · {band.start.toLocaleString()}-
                    {band.end.toLocaleString()}
                  </title>
                </rect>
                {w > 56 && (
                  <text
                    x={x1 + 3}
                    y={23}
                    fontSize={7}
                    fill="#6b7280"
                    fontFamily="ui-monospace, monospace"
                  >
                    {bandShortLabel(band.key)}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      )}

      {/* intron backbone (drawn first so exons cover it) */}
      {geom.intronLines.map((line, i) => (
        <g key={`intron-${i}`}>
          <line
            x1={line.x1}
            x2={line.x2}
            y1={line.y + TRACK_OFFSET}
            y2={line.y + TRACK_OFFSET}
            stroke="#d1d5db"
            strokeWidth={1}
          />
          {/* chevron mid-intron indicating strand */}
          {line.x2 - line.x1 > 24 && (
            <polyline
              points={chevronPoints(
                (line.x1 + line.x2) / 2,
                line.y + TRACK_OFFSET,
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
          y={exonY(box, geom.trackY) + TRACK_OFFSET}
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
        const isLinked = linkedEventId === ev.eventId;
        const titleImpact = ev.impactClass
          ? ` · ${impactClassLabel(ev.impactClass)}`
          : '';
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
              fillOpacity={isLinked ? 0.38 : 0.25}
              stroke={SV_FILL.INS}
              strokeWidth={isLinked ? 2.5 : 1.5}
            >
              <title>
                {ev.eventId} · INS{titleImpact} · sample carries{' '}
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
                strokeWidth={isLinked ? 2.5 : 1.5}
                strokeDasharray="3,2"
              />
              {isLinked && (
                <circle
                  cx={x1}
                  cy={svLaneMid}
                  r={8}
                  fill="none"
                  stroke={SV_FILL.DEL}
                  strokeWidth={1}
                />
              )}
              <polygon points={points} fill={SV_FILL.DEL}>
                <title>
                  {ev.eventId} · DEL{titleImpact} · breakpoint (sample lacks{' '}
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
            strokeWidth={isLinked ? 2.5 : 1.5}
          >
            <title>
              {ev.eventId} · COMPLEX{titleImpact} · sample's allele{' '}
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
            y1={TRACK_OFFSET}
            y2={height + TRACK_OFFSET}
            stroke="#ef4444"
            strokeWidth={1}
            opacity={0.7}
          >
            <title>{t.label ?? `variant @ ${t.pos.toLocaleString()}`}</title>
          </line>
          <circle cx={t.x} cy={TRACK_OFFSET - 12} r={2.5} fill="#ef4444">
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

function bandFill(key: GeneContextBand['key']): string {
  if (key === 'gene_body') return '#f3f4f6';
  if (key === 'promoter_2kb') return '#fef3c7';
  if (key === 'upstream_2_10kb') return '#ecfdf5';
  if (key === 'downstream_2kb') return '#eff6ff';
  return '#f9fafb';
}

function bandShortLabel(key: GeneContextBand['key']): string {
  if (key === 'gene_body') return 'gene';
  if (key === 'promoter_2kb') return 'promoter';
  if (key === 'upstream_2_10kb') return 'upstream';
  if (key === 'downstream_2kb') return 'downstream';
  return key;
}

function chevronPoints(cx: number, cy: number, strand: '+' | '-'): string {
  // Forward-looking chevron: ›   Reverse: ‹
  const dx = strand === '+' ? 3 : -3;
  const dy = 2;
  return `${cx - dx},${cy - dy} ${cx + dx},${cy} ${cx - dx},${cy + dy}`;
}

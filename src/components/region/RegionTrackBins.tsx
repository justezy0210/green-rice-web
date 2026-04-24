import {
  BIN_COUNT,
  GENE_COLOR_FOCUSED,
  GENE_COLOR_OG,
  GENE_COLOR_ORPHAN,
  GENE_H_SUMMARY,
  GENE_TOP,
  MARGIN_LEFT,
  MARGIN_RIGHT,
  RULER_Y,
  SV_H_SUMMARY,
  SV_TOP,
  WIDTH,
  type Tick,
} from '@/lib/region-track-layout';
import type { RegionBin } from '@/lib/region-helpers';

/**
 * Amber full-height rectangle marking a pinned gene. In detail mode
 * it follows the gene's exact coordinates (clamped to 3 px minimum
 * so sub-pixel genes remain visible); in summary mode it widens to
 * the whole bin the gene's midpoint falls into, so the highlight
 * has the same visual weight as the hover outline.
 */
export function HighlightOverlay({
  gene,
  geneDetail,
  xOf,
  start,
  span,
  binWidth,
}: {
  gene: { start: number; end: number };
  geneDetail: boolean;
  xOf: (pos: number) => number;
  start: number;
  span: number;
  binWidth: number;
}) {
  let xHl: number;
  let wHl: number;
  if (geneDetail) {
    const x1 = xOf(gene.start);
    const x2 = xOf(gene.end);
    xHl = x1;
    wHl = Math.max(3, x2 - x1);
  } else {
    const mid = (gene.start + gene.end) / 2;
    let idx = Math.floor((mid - start) / (span / BIN_COUNT));
    if (idx < 0) idx = 0;
    if (idx >= BIN_COUNT) idx = BIN_COUNT - 1;
    xHl = MARGIN_LEFT + idx * binWidth;
    wHl = binWidth;
  }
  return (
    <rect
      x={xHl}
      y={GENE_TOP - 3}
      width={wHl}
      height={SV_TOP + SV_H_SUMMARY - GENE_TOP + 6}
      fill="#f59e0b"
      fillOpacity={0.25}
      stroke="#d97706"
      strokeWidth={1.2}
      pointerEvents="none"
    />
  );
}

/** Thin blue outline drawn around the hovered bin in summary mode. */
export function HoverBinOutline({
  binIndex,
  binWidth,
}: {
  binIndex: number;
  binWidth: number;
}) {
  return (
    <rect
      x={MARGIN_LEFT + binIndex * binWidth}
      y={GENE_TOP - 2}
      width={binWidth}
      height={SV_TOP + SV_H_SUMMARY - GENE_TOP + 4}
      fill="none"
      stroke="#2563eb"
      strokeWidth={0.8}
      pointerEvents="none"
    />
  );
}

export function TrackRuler({
  ticks,
  xOf,
}: {
  ticks: Tick[];
  xOf: (pos: number) => number;
}) {
  return (
    <>
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
    </>
  );
}

/**
 * Summary-mode SVG bins. `GeneBin` is the full-height hit target plus
 * the stacked gene histogram (orphan below, OG-assigned above) with
 * sqrt height scaling; `SvBin` overlays the type-stacked SV histogram
 * in the SV lane. Both assume the parent supplies `binWidth` in
 * pixels and the normalisation max across all bins so a single
 * hotspot does not flatten the rest of the track.
 */

export function GeneBin({
  bin,
  binWidth,
  maxGeneBin,
  hovered,
  onHover,
  onZoom,
}: {
  bin: RegionBin;
  binWidth: number;
  maxGeneBin: number;
  hovered: boolean;
  onHover: (i: number | null) => void;
  onZoom: (b: RegionBin) => void;
}) {
  const x = MARGIN_LEFT + bin.i * binWidth;
  const w = Math.max(0.5, binWidth - 0.5);
  const h =
    maxGeneBin === 0
      ? 0
      : (Math.sqrt(bin.geneCount) / Math.sqrt(maxGeneBin)) * GENE_H_SUMMARY;
  const ogH = bin.geneCount === 0 ? 0 : (bin.ogAssignedCount / bin.geneCount) * h;
  const yBase = GENE_TOP + GENE_H_SUMMARY;
  const interactive = bin.geneCount + bin.svTotal > 0;
  return (
    <g
      onMouseEnter={() => onHover(bin.i)}
      onMouseLeave={() => onHover(null)}
      onClick={() => interactive && onZoom(bin)}
      style={{ cursor: interactive ? 'pointer' : 'default' }}
    >
      {/* full-column hit region so empty bins are still hoverable */}
      <rect
        x={x}
        y={GENE_TOP}
        width={binWidth}
        height={SV_TOP + SV_H_SUMMARY - GENE_TOP}
        fill="transparent"
      />
      {/* Persistent indigo outline on bins that contain focused-OG
          members, so they pop across a 120-bin chromosome even when
          the histogram segment would otherwise be sub-pixel. */}
      {bin.focusedOgCount > 0 && (
        <rect
          x={x}
          y={GENE_TOP - 1}
          width={w}
          height={SV_TOP + SV_H_SUMMARY - GENE_TOP + 2}
          fill="none"
          stroke={GENE_COLOR_FOCUSED}
          strokeWidth={1}
          pointerEvents="none"
        />
      )}
      {h > 0 && (
        <>
          <rect
            x={x}
            y={yBase - h}
            width={w}
            height={h - ogH}
            fill={GENE_COLOR_ORPHAN}
            opacity={hovered ? 1 : 0.75}
          />
          <rect
            x={x}
            y={yBase - ogH}
            width={w}
            height={ogH}
            fill={GENE_COLOR_OG}
            opacity={hovered ? 1 : 0.8}
          />
          {bin.focusedOgCount > 0 && (() => {
            // Force a visible minimum so a bin with 1 focused gene
            // inside a 50-gene bin still shows a clear indigo cap.
            const proportional = (bin.focusedOgCount / bin.geneCount) * h;
            const focusedH = Math.max(3, proportional);
            return (
              <rect
                x={x}
                y={yBase - focusedH}
                width={w}
                height={focusedH}
                fill={GENE_COLOR_FOCUSED}
                opacity={hovered ? 1 : 0.95}
              />
            );
          })()}
        </>
      )}
    </g>
  );
}


import {
  MARGIN_LEFT,
  MARGIN_RIGHT,
  SV_COLOR,
  SV_H_DETAIL,
  SV_H_SUMMARY,
  SV_STACK,
  SV_TOP,
  WIDTH,
  sizeTier,
  sizeTierColor,
} from '@/lib/region-track-layout';
import { formatBp, type RegionBin } from '@/lib/region-helpers';
import type { SvEvent, SvType } from '@/types/sv-event';

const INS_HALF_WIDTH = 3;
const GLYPH_MIN_HEIGHT = 3;
const GLYPH_MIN_WIDTH = 2;

/**
 * Log-scaled height fraction [0, 1] for a single SV event size.
 * Floor at 50 bp (the pangenome's minimum SV threshold), saturates
 * at 1 Mb — the lane caps there rather than letting a mega-event
 * escape the glyph.
 */
function svHeightFraction(bp: number): number {
  const capped = Math.min(Math.max(bp, 50), 1_000_000);
  const raw = (Math.log10(capped) - Math.log10(50)) / (6 - Math.log10(50));
  return Math.max(0.18, Math.min(1, raw));
}

/**
 * SVG `<defs>` entries that must live inside the track SVG root for
 * the DEL hollow-gap and COMPLEX rearrangement-footprint glyphs to
 * reference their hatch patterns via `fill="url(#…)"`.
 */
export function SvGlyphDefs() {
  return (
    <defs>
      <pattern
        id="del-hatch"
        patternUnits="userSpaceOnUse"
        width={4}
        height={4}
        patternTransform="rotate(45)"
      >
        <line
          x1={0}
          y1={0}
          x2={0}
          y2={4}
          stroke={SV_COLOR.DEL}
          strokeWidth={0.8}
          opacity={0.55}
        />
      </pattern>
      <pattern
        id="complex-hatch"
        patternUnits="userSpaceOnUse"
        width={4}
        height={4}
        patternTransform="rotate(45)"
      >
        <line
          x1={0}
          y1={0}
          x2={0}
          y2={4}
          stroke={SV_COLOR.COMPLEX}
          strokeWidth={0.8}
          opacity={0.7}
        />
      </pattern>
    </defs>
  );
}

/** Faint reference baseline line spanning the SV lane midline. */
export function SvBaseline() {
  return (
    <line
      x1={MARGIN_LEFT}
      x2={WIDTH - MARGIN_RIGHT}
      y1={SV_TOP + SV_H_DETAIL / 2}
      y2={SV_TOP + SV_H_DETAIL / 2}
      stroke="#d1d5db"
      strokeWidth={0.5}
    />
  );
}

/**
 * Detail-mode SV glyph whose shape directly encodes what the event
 * did to the reference:
 * - DEL: hollow hatched rectangle spanning `pos`…`pos + refLen` —
 *   reads as "this chunk of the reference is absent in the sample".
 * - INS: teal upward caret at `pos` with height ∝ log(altLen) —
 *   reads as "this much novel sequence was inserted here". The
 *   caret has no horizontal extent because insertions have no
 *   reference footprint.
 * - COMPLEX: purple hatched rectangle spanning the snarl footprint
 *   (`pos` … `pos + max(refLen, altLen)`) — reads as "this region
 *   is rearranged". Inversions land here; using `max(refLen,
 *   altLen)` keeps them from collapsing to zero when `svLenAbs` is
 *   near zero.
 */
export function SvGlyph({
  ev,
  xOf,
}: {
  ev: SvEvent;
  xOf: (pos: number) => number;
}) {
  const baseline = SV_TOP + SV_H_DETAIL / 2;
  const x = xOf(ev.pos);

  if (ev.svType === 'DEL') {
    const x2 = xOf(ev.pos + ev.refLen);
    const w = Math.max(GLYPH_MIN_WIDTH, x2 - x);
    return (
      <g>
        <rect
          x={x}
          y={SV_TOP}
          width={w}
          height={SV_H_DETAIL}
          fill="url(#del-hatch)"
          stroke={SV_COLOR.DEL}
          strokeWidth={1}
          strokeDasharray="2,1.5"
        >
          <title>
            {ev.eventId} · DEL · {ev.chr}:{ev.pos.toLocaleString()} · ~
            {formatBp(ev.refLen)} deleted
          </title>
        </rect>
      </g>
    );
  }

  if (ev.svType === 'INS') {
    const h = Math.max(GLYPH_MIN_HEIGHT, svHeightFraction(ev.altLen) * SV_H_DETAIL);
    const apex = baseline - h;
    const path = `M ${x - INS_HALF_WIDTH},${baseline} L ${x + INS_HALF_WIDTH},${baseline} L ${x},${apex} Z`;
    return (
      <path d={path} fill={SV_COLOR.INS} opacity={0.85}>
        <title>
          {ev.eventId} · INS · {ev.chr}:{ev.pos.toLocaleString()} · ~
          {formatBp(ev.altLen)} inserted
        </title>
      </path>
    );
  }

  if (ev.svType === 'COMPLEX') {
    const footprint = Math.max(ev.refLen, ev.altLen);
    const x2 = xOf(ev.pos + footprint);
    const w = Math.max(GLYPH_MIN_WIDTH, x2 - x);
    return (
      <rect
        x={x}
        y={SV_TOP}
        width={w}
        height={SV_H_DETAIL}
        fill="url(#complex-hatch)"
        stroke={SV_COLOR.COMPLEX}
        strokeWidth={0.8}
        opacity={0.9}
      >
        <title>
          {ev.eventId} · COMPLEX · {ev.chr}:{ev.pos.toLocaleString()} · ref{' '}
          {formatBp(ev.refLen)} → alt {formatBp(ev.altLen)} (ref replaced with
          different sequence)
        </title>
      </rect>
    );
  }

  return null;
}

/**
 * Summary-mode SV histogram column: per-type stacked counts for
 * recurrence, plus an optional size-tier strip on top that surfaces
 * the bin's largest event scale. Height encoding stays on count
 * (sqrt) so a single very-large SV cannot flatten a cluster of
 * smaller events.
 */
export function SvBin({
  bin,
  binWidth,
  maxSvBin,
  hovered,
}: {
  bin: RegionBin;
  binWidth: number;
  maxSvBin: number;
  hovered: boolean;
}) {
  const x = MARGIN_LEFT + bin.i * binWidth;
  const w = Math.max(0.5, binWidth - 0.5);
  const yBase = SV_TOP + SV_H_SUMMARY;
  const h =
    bin.svTotal === 0 || maxSvBin === 0
      ? 0
      : (Math.sqrt(bin.svTotal) / Math.sqrt(maxSvBin)) * SV_H_SUMMARY;
  const yTop = yBase - h;
  const offsets: { t: SvType; y: number; h: number }[] = [];
  let acc = 0;
  for (const t of [...SV_STACK].reverse()) {
    const c = bin.svCount[t];
    if (c === 0) continue;
    const segH = (c / bin.svTotal) * h;
    offsets.push({ t, y: yTop + acc, h: segH });
    acc += segH;
  }
  const tier = sizeTier(bin.maxEventScaleBp);
  const tierColor = sizeTierColor(tier);
  const STRIP_H = 2.5;
  return (
    <g>
      {offsets.map((o) => (
        <rect
          key={o.t}
          x={x}
          y={o.y}
          width={w}
          height={o.h}
          fill={SV_COLOR[o.t]}
          opacity={hovered ? 1 : 0.8}
        />
      ))}
      {tierColor && (
        <rect
          x={x}
          y={yTop - STRIP_H - 1}
          width={w}
          height={STRIP_H}
          fill={tierColor}
          opacity={hovered ? 1 : 0.95}
        />
      )}
    </g>
  );
}

import type { SvType } from '@/types/sv-event';

/**
 * Shared layout constants and small math helpers for the Region
 * track. Kept here so `RegionTrackViz` and the `RegionTrackBins`
 * subcomponents agree on coordinates without cross-component imports.
 */

export const WIDTH = 960;
export const MARGIN_LEFT = 8;
export const MARGIN_RIGHT = 12;
export const RULER_Y = 14;
// Vertical padding between one lane's content and the next lane's
// 8-px label. Big enough that a label (text extent ≈ 8 px) never
// collides with the rectangles below/above it.
const LANE_GAP = 14;
// Candidate-block annotation lane sits between the ruler and genes.
// Blocks are deduped by blockId (the same curated region shared across
// trait runs collapses to a single bar) so a single row suffices; rare
// distinct-blockId overlaps visually stack in the same row but stay
// individually discoverable through the Overlapping-blocks panel below.
export const BLOCK_TOP = 26;
export const BLOCK_ROW_H = 6;
export const BLOCK_MAX_ROWS = 1;
const BLOCK_H = BLOCK_ROW_H * BLOCK_MAX_ROWS + 2;
export const GENE_TOP = BLOCK_TOP + BLOCK_H + LANE_GAP;
export const GENE_H_SUMMARY = 28;
export const GENE_H_DETAIL = 10;
export const SV_TOP =
  GENE_TOP + Math.max(GENE_H_SUMMARY, GENE_H_DETAIL) + LANE_GAP;
export const SV_H_SUMMARY = 22;
export const SV_H_DETAIL = 18;

export const BIN_COUNT = 120;
export const DETAIL_GENE_LIMIT = 200;
export const DETAIL_GENE_SPAN_LIMIT = 2_000_000;
export const DETAIL_SV_LIMIT = 150;
export const DETAIL_SV_SPAN_LIMIT = 1_000_000;
export const MIN_ZOOM_BP = 100;

export const SV_COLOR: Record<SvType, string> = {
  INS: '#0f766e',
  DEL: '#b91c1c',
  COMPLEX: '#7c3aed',
};

// Semantic gene-lane colors. Every presentation site reads these so
// the focused / OG-assigned / orphan palette stays consistent across
// detail bars, summary histogram segments and legend swatches.
export const GENE_COLOR_FOCUSED = '#4f46e5'; // indigo-600
export const GENE_COLOR_OG = '#16a34a'; // green-600
export const GENE_COLOR_ORPHAN = '#9ca3af'; // gray-400
// Histogram stack order, bottom-up (DEL → INS → COMPLEX).
export const SV_STACK: SvType[] = ['DEL', 'INS', 'COMPLEX'];

// SV-size tiers used across detail ticks, summary strip and legend.
// Thresholds are coarse on purpose — researchers answer "is there a
// big one here?" first, and precise bp is in the tooltip.
export const SIZE_TIER_MID_BP = 10_000;
export const SIZE_TIER_HIGH_BP = 100_000;
export const SIZE_TIER_COLOR_MID = '#f59e0b'; // gold
export const SIZE_TIER_COLOR_HIGH = '#c2410c'; // deep orange

export type SizeTier = 'none' | 'mid' | 'high';

export function sizeTier(bp: number): SizeTier {
  if (bp >= SIZE_TIER_HIGH_BP) return 'high';
  if (bp >= SIZE_TIER_MID_BP) return 'mid';
  return 'none';
}

export function sizeTierColor(t: SizeTier): string | null {
  return t === 'high'
    ? SIZE_TIER_COLOR_HIGH
    : t === 'mid'
      ? SIZE_TIER_COLOR_MID
      : null;
}

export interface Tick {
  pos: number;
  label: string;
}

export function buildTicks(start: number, end: number): Tick[] {
  const span = end - start;
  const rawStep = span / 6;
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
  for (const c of [1, 2, 5, 10]) {
    if (c * mag >= raw) return c * mag;
  }
  return 10 * mag;
}

function formatTickLabel(pos: number): string {
  if (pos >= 1_000_000) return `${(pos / 1_000_000).toFixed(1)}M`;
  if (pos >= 1_000) return `${(pos / 1_000).toFixed(0)}k`;
  return `${pos}`;
}

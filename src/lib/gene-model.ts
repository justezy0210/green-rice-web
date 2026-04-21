/**
 * Pure helpers for the gene model SVG renderer.
 *
 * Coordinates are mapped linearly from genomic space [geneStart, geneEnd]
 * to pixel space [0, width]. Strand direction is honored — on '-', we
 * reverse so the 5′ end is on the left visually (UTR5 left, UTR3 right).
 */

import type { GeneExonSegment, GeneModelEntry } from '@/types/gene-model';

export interface ExonBox {
  x: number;
  width: number;
  type: 'UTR5' | 'CDS' | 'UTR3';
  start: number;
  end: number;
}

export interface GeneModelGeometry {
  width: number;
  height: number;
  trackY: number;
  exonBoxes: ExonBox[];
  intronLines: { x1: number; x2: number; y: number }[];
  strand: '+' | '-';
  geneStart: number;
  geneEnd: number;
}

const UTR_HEIGHT = 8;
const CDS_HEIGHT = 16;
const TRACK_PADDING = 4;
const DEFAULT_HEIGHT = 40;

export function computeGeneModelGeometry(
  gene: GeneModelEntry,
  width: number,
  height: number = DEFAULT_HEIGHT,
): GeneModelGeometry {
  const span = Math.max(1, gene.end - gene.start);
  const strand: '+' | '-' = gene.strand === '-' ? '-' : '+';
  const trackY = height / 2;

  const xOf = (pos: number) => {
    const norm = (pos - gene.start) / span;
    // On '-' strand we flip so 5′ is on the left (matches typical browser)
    const frac = strand === '-' ? 1 - norm : norm;
    return frac * width;
  };

  const boxes: ExonBox[] = [];
  const pushBoxes = (segs: GeneExonSegment[], kind: ExonBox['type']) => {
    for (const s of segs) {
      const x1 = xOf(s.start);
      const x2 = xOf(s.end);
      const x = Math.min(x1, x2);
      const w = Math.max(1, Math.abs(x2 - x1));
      boxes.push({ x, width: w, type: kind, start: s.start, end: s.end });
    }
  };
  pushBoxes(gene.transcript.utr5, 'UTR5');
  pushBoxes(gene.transcript.cds, 'CDS');
  pushBoxes(gene.transcript.utr3, 'UTR3');

  // Intron lines: connect sorted exon union boundaries
  const union = [...boxes]
    .map(({ start, end }) => ({ start, end }))
    .sort((a, b) => a.start - b.start);
  // Merge overlapping/touching
  const merged: GeneExonSegment[] = [];
  for (const seg of union) {
    const last = merged[merged.length - 1];
    if (last && seg.start <= last.end + 1) {
      last.end = Math.max(last.end, seg.end);
    } else {
      merged.push({ ...seg });
    }
  }
  const intronLines: { x1: number; x2: number; y: number }[] = [];
  for (let i = 0; i < merged.length - 1; i++) {
    const a = merged[i];
    const b = merged[i + 1];
    const ax = xOf(a.end);
    const bx = xOf(b.start);
    intronLines.push({
      x1: Math.min(ax, bx),
      x2: Math.max(ax, bx),
      y: trackY,
    });
  }

  return {
    width,
    height,
    trackY,
    exonBoxes: boxes,
    intronLines,
    strand,
    geneStart: gene.start,
    geneEnd: gene.end,
  };
}

export function exonHeight(type: ExonBox['type']): number {
  return type === 'CDS' ? CDS_HEIGHT : UTR_HEIGHT;
}

export function exonY(box: ExonBox, trackY: number): number {
  const h = exonHeight(box.type);
  return trackY - h / 2;
}

export const EXON_COLORS: Record<ExonBox['type'], string> = {
  UTR5: 'rgba(156, 163, 175, 0.55)', // gray-400
  CDS: 'rgba(22, 163, 74, 0.9)',      // green-600
  UTR3: 'rgba(156, 163, 175, 0.55)',
};

export const TRACK_PADDING_PX = TRACK_PADDING;

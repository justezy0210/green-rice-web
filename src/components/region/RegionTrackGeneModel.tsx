import { GENE_H_DETAIL, GENE_TOP } from '@/lib/region-track-layout';
import type { RegionGene } from '@/lib/region-helpers';

/**
 * Genome-browser-style gene glyph for detail mode: a thin intron
 * spine across the whole `start`–`end` span, CDS rendered as
 * full-height boxes, UTRs as half-height boxes, so the exon
 * structure of the representative transcript reads at a glance.
 *
 * When the pixel width of the gene drops below a minimum legible
 * threshold (≤3 px) the glyph collapses back to a solid bar so a
 * sub-pixel gene still registers visually.
 */
export function GeneModel({
  gene,
  xOf,
  fill,
  opacity,
  minWidth,
  onHover,
}: {
  gene: RegionGene;
  xOf: (pos: number) => number;
  fill: string;
  opacity: number;
  minWidth: number;
  onHover: (g: RegionGene | null) => void;
}) {
  const x1 = xOf(gene.start);
  const x2 = xOf(gene.end);
  const pixelW = x2 - x1;
  if (pixelW < 3) {
    return (
      <rect
        x={x1}
        y={GENE_TOP}
        width={Math.max(minWidth, pixelW)}
        height={GENE_H_DETAIL}
        fill={fill}
        opacity={opacity}
        onMouseEnter={() => onHover(gene)}
        onMouseLeave={() => onHover(null)}
        style={{ cursor: 'pointer' }}
      />
    );
  }
  const midY = GENE_TOP + GENE_H_DETAIL / 2;
  const utrH = GENE_H_DETAIL / 2;
  const utrY = GENE_TOP + (GENE_H_DETAIL - utrH) / 2;
  const cds = gene.transcript?.cds ?? [];
  const utr5 = gene.transcript?.utr5 ?? [];
  const utr3 = gene.transcript?.utr3 ?? [];
  const renderExon = (
    seg: { start: number; end: number },
    key: string,
    y: number,
    h: number,
    fillOpacity: number,
  ) => {
    const sx = xOf(seg.start);
    const sw = Math.max(0.5, xOf(seg.end) - sx);
    return (
      <rect
        key={key}
        x={sx}
        y={y}
        width={sw}
        height={h}
        fill={fill}
        opacity={fillOpacity}
      />
    );
  };
  return (
    <g
      onMouseEnter={() => onHover(gene)}
      onMouseLeave={() => onHover(null)}
      style={{ cursor: 'pointer' }}
    >
      {/* invisible hit region so hover works over introns too */}
      <rect
        x={x1}
        y={GENE_TOP}
        width={pixelW}
        height={GENE_H_DETAIL}
        fill="transparent"
      />
      <line
        x1={x1}
        x2={x2}
        y1={midY}
        y2={midY}
        stroke={fill}
        strokeWidth={1}
        opacity={opacity * 0.9}
      />
      {utr5.map((s, i) => renderExon(s, `u5-${i}`, utrY, utrH, opacity * 0.7))}
      {utr3.map((s, i) => renderExon(s, `u3-${i}`, utrY, utrH, opacity * 0.7))}
      {cds.map((s, i) =>
        renderExon(s, `cds-${i}`, GENE_TOP, GENE_H_DETAIL, opacity),
      )}
    </g>
  );
}

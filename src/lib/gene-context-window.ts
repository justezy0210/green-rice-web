import type { GeneModelEntry, GeneExonSegment } from '@/types/gene-model';
import type { SvType } from '@/types/sv-event';

export const PROMOTER_BP = 2_000;
export const UPSTREAM_BP = 10_000;
export const DOWNSTREAM_BP = 2_000;
export const DEL_BREAKPOINT_BP = 5;

export type GeneContextImpactClass =
  | 'coding_or_splice'
  | 'utr'
  | 'intron'
  | 'promoter_2kb'
  | 'upstream_2_10kb'
  | 'downstream_2kb';

export interface GeneContextBand {
  key: GeneContextImpactClass | 'gene_body';
  label: string;
  start: number;
  end: number;
}

export interface GeneContextWindow {
  start: number;
  end: number;
  bands: GeneContextBand[];
}

export function buildGeneContextWindow(gene: GeneModelEntry): GeneContextWindow {
  const strand = gene.strand === '-' ? '-' : '+';
  const bands: GeneContextBand[] =
    strand === '-'
      ? [
          {
            key: 'upstream_2_10kb',
            label: 'upstream 2-10 kb',
            start: gene.end + PROMOTER_BP + 1,
            end: gene.end + UPSTREAM_BP,
          },
          {
            key: 'promoter_2kb',
            label: 'promoter 2 kb',
            start: gene.end + 1,
            end: gene.end + PROMOTER_BP,
          },
          {
            key: 'gene_body',
            label: 'gene body',
            start: gene.start,
            end: gene.end,
          },
          {
            key: 'downstream_2kb',
            label: 'downstream 2 kb',
            start: gene.start - DOWNSTREAM_BP,
            end: gene.start - 1,
          },
        ]
      : [
          {
            key: 'upstream_2_10kb',
            label: 'upstream 2-10 kb',
            start: gene.start - UPSTREAM_BP,
            end: gene.start - PROMOTER_BP - 1,
          },
          {
            key: 'promoter_2kb',
            label: 'promoter 2 kb',
            start: gene.start - PROMOTER_BP,
            end: gene.start - 1,
          },
          {
            key: 'gene_body',
            label: 'gene body',
            start: gene.start,
            end: gene.end,
          },
          {
            key: 'downstream_2kb',
            label: 'downstream 2 kb',
            start: gene.end + 1,
            end: gene.end + DOWNSTREAM_BP,
          },
        ];

  const clipped = bands
    .map((band) => ({ ...band, start: Math.max(1, band.start) }))
    .filter((band) => band.end >= band.start);

  return {
    start: Math.min(...clipped.map((band) => band.start)),
    end: Math.max(...clipped.map((band) => band.end)),
    bands: clipped,
  };
}

export function classifySvGeneContext(
  gene: GeneModelEntry,
  sv: { pos: number; refLen: number; svType: SvType },
): GeneContextImpactClass | null {
  const span = svFootprint(sv);
  const cdsRanges = ranges(gene.transcript.cds);
  const utrRanges = ranges([...gene.transcript.utr5, ...gene.transcript.utr3]);
  const spliceRanges = spliceSitesFromCds(gene.transcript.cds);
  const context = buildGeneContextWindow(gene);

  if (
    overlapsAny(span.start, span.end, cdsRanges) ||
    overlapsAny(span.start, span.end, spliceRanges)
  ) {
    return 'coding_or_splice';
  }
  if (overlapsAny(span.start, span.end, utrRanges)) return 'utr';
  if (overlaps(span.start, span.end, gene.start, gene.end)) return 'intron';

  for (const band of context.bands) {
    if (band.key === 'gene_body') continue;
    if (overlaps(span.start, span.end, band.start, band.end)) return band.key;
  }

  return null;
}

function svFootprint(sv: {
  pos: number;
  refLen: number;
  svType: SvType;
}): { start: number; end: number } {
  if (sv.svType === 'DEL') {
    return {
      start: Math.max(1, sv.pos - DEL_BREAKPOINT_BP),
      end: sv.pos + DEL_BREAKPOINT_BP,
    };
  }
  return {
    start: sv.pos,
    end: sv.pos + Math.max(1, sv.refLen),
  };
}

function ranges(segments: GeneExonSegment[]): Array<{ start: number; end: number }> {
  return segments.map((segment) => ({ start: segment.start, end: segment.end }));
}

function spliceSitesFromCds(cds: GeneExonSegment[]): Array<{ start: number; end: number }> {
  const sorted = [...cds].sort((a, b) => a.start - b.start);
  const sites: Array<{ start: number; end: number }> = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const intronStart = sorted[i].end + 1;
    const intronEnd = sorted[i + 1].start - 1;
    if (intronEnd < intronStart) continue;
    sites.push({ start: intronStart, end: Math.min(intronStart + 1, intronEnd) });
    sites.push({ start: Math.max(intronEnd - 1, intronStart), end: intronEnd });
  }
  return sites;
}

function overlapsAny(
  start: number,
  end: number,
  rangesToTest: Array<{ start: number; end: number }>,
): boolean {
  return rangesToTest.some((range) => overlaps(start, end, range.start, range.end));
}

function overlaps(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return !(aEnd < bStart || aStart > bEnd);
}

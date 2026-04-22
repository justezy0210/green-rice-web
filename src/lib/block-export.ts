import type { Candidate } from '@/types/candidate';
import type { CandidateBlock } from '@/types/candidate-block';
import type { IntersectionRow } from '@/types/intersection';

/**
 * TSV/markdown formatters for the Block-detail Export panel.
 * Pure functions — no React, no fetch, no Blob creation. The UI
 * layer turns the returned strings into downloads.
 *
 * Structure mirrors the server-side `curated_blocks/{name}/*` bundles
 * so a downloaded export is a drop-in replacement for the raw
 * artefact. Scope strip is baked into summary.md; callers MUST
 * surface it in UI as well.
 */

const CANDIDATE_COLUMNS = [
  'rank',
  'orthogroup',
  'candidate_type',
  'combined_score',
  'base_rank',
  'base_score',
  'mean_diff',
  'log2_fc',
  'p_value',
  'q_value',
  'function_summary',
  'best_sv_id',
  'best_sv_type',
  'best_impact_class',
  'best_cultivar',
  'best_gene_id',
  'best_chrom',
  'best_start',
  'best_end',
  'best_abs_delta_af',
  'group_specificity_summary',
  'orthogroup_pattern_summary',
];

const INTERSECTION_COLUMNS = [
  'orthogroup',
  'event_id',
  'sv_type',
  'impact_class',
  'abs_delta_af',
  'cultivar',
  'gene_id',
  'chrom',
  'start',
  'end',
];

function tsvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  // Tabs and newlines break TSV parsers; replace with spaces.
  return s.replace(/[\t\r\n]/g, ' ');
}

function tsvRow(cells: unknown[]): string {
  return cells.map(tsvEscape).join('\t');
}

export function buildCandidatesTsv(candidates: Candidate[]): string {
  const lines: string[] = [CANDIDATE_COLUMNS.join('\t')];
  for (const c of candidates) {
    lines.push(
      tsvRow([
        c.rank,
        c.candidateId,
        c.candidateType,
        c.combinedScore ?? c.totalScore,
        c.baseRank ?? '',
        c.baseScore ?? '',
        c.meanDiff ?? '',
        c.log2FoldChange ?? '',
        c.pValue ?? '',
        c.qValue ?? '',
        c.functionSummary ?? '',
        c.bestSv?.eventId ?? '',
        c.bestSv?.svType ?? '',
        c.bestSv?.impactClass ?? '',
        c.bestSv?.cultivar ?? '',
        c.bestSv?.geneId ?? '',
        c.bestSv?.chr ?? '',
        c.bestSv?.start ?? '',
        c.bestSv?.end ?? '',
        c.bestSv?.absDeltaAf ?? '',
        c.groupSpecificitySummary ?? '',
        c.orthogroupPatternSummary ?? '',
      ]),
    );
  }
  return lines.join('\n') + '\n';
}

export function buildIntersectionsTsv(rows: IntersectionRow[]): string {
  const lines: string[] = [INTERSECTION_COLUMNS.join('\t')];
  for (const r of rows) {
    lines.push(
      tsvRow([
        r.ogId,
        r.eventId,
        r.svType,
        r.impactClass,
        r.absDeltaAf ?? '',
        r.cultivar,
        r.geneId ?? '',
        r.chr,
        r.start,
        r.end,
      ]),
    );
  }
  return lines.join('\n') + '\n';
}

function formatMb(bp: number): string {
  return `${(bp / 1_000_000).toFixed(3)} Mb`;
}

/**
 * Summary markdown. If the block already ships a curator-authored
 * summary (curated review regions do), prefer that text verbatim;
 * otherwise synthesise a short header from the block fields.
 */
export function buildBlockSummaryMd(
  block: CandidateBlock,
  candidateCount: number,
  intersectionCount: number,
): string {
  if (block.curated && block.summaryMarkdown) {
    return block.summaryMarkdown.endsWith('\n')
      ? block.summaryMarkdown
      : block.summaryMarkdown + '\n';
  }
  const lines: string[] = [];
  lines.push(`# ${block.blockId}`);
  lines.push('');
  lines.push(`- Trait: ${block.traitId}`);
  lines.push(
    `- Region: ${block.region.chr}:${block.region.start.toLocaleString()}-${block.region.end.toLocaleString()} (${formatMb(block.region.start)} – ${formatMb(block.region.end)})`,
  );
  lines.push(`- Block type: ${block.blockType}`);
  lines.push(`- Run: ${block.runId}`);
  lines.push(`- Candidate rows: ${candidateCount}`);
  lines.push(`- Intersection rows: ${intersectionCount}`);
  if (block.representativeAnnotations.length > 0) {
    lines.push('- Representative annotations:');
    for (const a of block.representativeAnnotations.slice(0, 10)) {
      lines.push(`  - ${a}`);
    }
  }
  lines.push('');
  lines.push(
    '> Candidate-discovery export. Not validation-grade, not causal, not marker-ready.',
  );
  lines.push(
    '> Window boundaries do not imply an inferred haplotype. See scope.md.',
  );
  lines.push('');
  return lines.join('\n');
}

export interface BlockExportFile {
  filename: string;
  content: string;
  mediaType: 'text/tab-separated-values' | 'text/markdown';
}

export function enumerateBlockExports(
  block: CandidateBlock,
  candidates: Candidate[],
  intersections: IntersectionRow[],
): BlockExportFile[] {
  const base = block.blockId;
  const files: BlockExportFile[] = [
    {
      filename: `${base}.candidates.tsv`,
      content: buildCandidatesTsv(candidates),
      mediaType: 'text/tab-separated-values',
    },
    {
      filename: `${base}.intersections.tsv`,
      content: buildIntersectionsTsv(intersections),
      mediaType: 'text/tab-separated-values',
    },
    {
      filename: `${base}.summary.md`,
      content: buildBlockSummaryMd(block, candidates.length, intersections.length),
      mediaType: 'text/markdown',
    },
  ];
  return files;
}

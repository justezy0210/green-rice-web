import { createReadStream } from 'fs';
import { createInterface } from 'readline';

export interface GeneStats {
  geneCount: number;
  avgGeneLength: number;
  geneDensity: Record<string, number>;
}

export interface RepeatStats {
  totalRepeatLength: number;
  repeatPercent: number;
  classDistribution: Record<string, number>;
  repeatDensity: Record<string, number>;
}

export async function parseGeneGff3(
  filePath: string,
  chromosomeLengths: Record<string, number>,
): Promise<GeneStats> {
  const geneCounts: Record<string, number> = {};
  let geneCount = 0;
  let totalGeneLength = 0;

  const rl = createInterface({
    input: createReadStream(filePath, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (line.startsWith('#') || !line.trim()) continue;
    const cols = line.split('\t');
    if (cols.length < 9) continue;

    const type = cols[2];
    if (type !== 'gene') continue;

    const chr = cols[0];
    const start = parseInt(cols[3], 10);
    const end = parseInt(cols[4], 10);

    geneCount++;
    totalGeneLength += end - start + 1;
    geneCounts[chr] = (geneCounts[chr] || 0) + 1;
  }

  const geneDensity: Record<string, number> = {};
  for (const [chr, count] of Object.entries(geneCounts)) {
    const chrLen = chromosomeLengths[chr];
    if (chrLen && chrLen > 0) {
      geneDensity[chr] = (count / chrLen) * 1_000_000;
    }
  }

  return {
    geneCount,
    avgGeneLength: geneCount > 0 ? Math.round(totalGeneLength / geneCount) : 0,
    geneDensity,
  };
}

/**
 * Parse RepeatMasker .out file.
 * Columns (space-delimited, after 3 header lines):
 *   SW_score, perc_div, perc_del, perc_ins, query_sequence,
 *   query_begin, query_end, query_left, strand,
 *   repeat_name, class/family, repeat_begin, repeat_end, repeat_left, ID
 */
export async function parseRepeatOut(
  filePath: string,
  chromosomeLengths: Record<string, number>,
  totalGenomeSize: number,
): Promise<RepeatStats> {
  const classDistribution: Record<string, number> = {};
  const repeatBpPerChr: Record<string, number> = {};
  let totalRepeatLength = 0;

  const rl = createInterface({
    input: createReadStream(filePath, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });

  let headerLines = 0;
  for await (const line of rl) {
    const trimmed = line.trim();
    // Skip the first 3 header lines and empty lines
    if (!trimmed) continue;
    if (headerLines < 3) {
      headerLines++;
      continue;
    }

    const cols = trimmed.split(/\s+/);
    if (cols.length < 11) continue;

    const chr = cols[4];
    const start = parseInt(cols[5], 10);
    const end = parseInt(cols[6], 10);
    if (isNaN(start) || isNaN(end)) continue;

    const len = end - start + 1;
    totalRepeatLength += len;
    repeatBpPerChr[chr] = (repeatBpPerChr[chr] || 0) + len;

    const classFamily = cols[10]; // e.g. "LTR/Gypsy", "DNA/hAT-Ac", "LINE/L1"
    const repeatClass = classifyRepeat(classFamily);
    classDistribution[repeatClass] = (classDistribution[repeatClass] || 0) + len;
  }

  const repeatDensity: Record<string, number> = {};
  for (const [chr, bp] of Object.entries(repeatBpPerChr)) {
    const chrLen = chromosomeLengths[chr];
    if (chrLen && chrLen > 0) {
      repeatDensity[chr] = (bp / chrLen) * 1_000_000;
    }
  }

  return {
    totalRepeatLength,
    repeatPercent: totalGenomeSize > 0 ? (totalRepeatLength / totalGenomeSize) * 100 : 0,
    classDistribution,
    repeatDensity,
  };
}

function classifyRepeat(classFamily: string): string {
  const upper = classFamily.toUpperCase();
  if (upper.startsWith('LTR')) return 'LTR';
  if (upper.startsWith('LINE')) return 'LINE';
  if (upper.startsWith('SINE')) return 'SINE';
  if (upper.startsWith('DNA') || upper.includes('TIR') || upper.includes('MITE') || upper.includes('HELITRON') || upper.includes('CACTA') || upper.includes('MULE') || upper.includes('HAT')) return 'DNA transposon';
  if (upper.includes('SIMPLE') || upper.includes('LOW_COMPLEXITY') || upper.includes('SATELLITE')) return 'Simple/Satellite';
  return 'Other';
}

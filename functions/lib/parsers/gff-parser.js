"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseGeneGff3 = parseGeneGff3;
exports.parseRepeatOut = parseRepeatOut;
const fs_1 = require("fs");
const readline_1 = require("readline");
async function parseGeneGff3(filePath, chromosomeLengths) {
    const geneCounts = {};
    let geneCount = 0;
    let totalGeneLength = 0;
    const rl = (0, readline_1.createInterface)({
        input: (0, fs_1.createReadStream)(filePath, { encoding: 'utf-8' }),
        crlfDelay: Infinity,
    });
    for await (const line of rl) {
        if (line.startsWith('#') || !line.trim())
            continue;
        const cols = line.split('\t');
        if (cols.length < 9)
            continue;
        const type = cols[2];
        if (type !== 'gene')
            continue;
        const chr = cols[0];
        const start = parseInt(cols[3], 10);
        const end = parseInt(cols[4], 10);
        geneCount++;
        totalGeneLength += end - start + 1;
        geneCounts[chr] = (geneCounts[chr] || 0) + 1;
    }
    const geneDensity = {};
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
async function parseRepeatOut(filePath, chromosomeLengths, totalGenomeSize) {
    const classDistribution = {};
    const repeatBpPerChr = {};
    let totalRepeatLength = 0;
    const rl = (0, readline_1.createInterface)({
        input: (0, fs_1.createReadStream)(filePath, { encoding: 'utf-8' }),
        crlfDelay: Infinity,
    });
    let headerLines = 0;
    for await (const line of rl) {
        const trimmed = line.trim();
        // Skip the first 3 header lines and empty lines
        if (!trimmed)
            continue;
        if (headerLines < 3) {
            headerLines++;
            continue;
        }
        const cols = trimmed.split(/\s+/);
        if (cols.length < 11)
            continue;
        const chr = cols[4];
        const start = parseInt(cols[5], 10);
        const end = parseInt(cols[6], 10);
        if (isNaN(start) || isNaN(end))
            continue;
        const len = end - start + 1;
        totalRepeatLength += len;
        repeatBpPerChr[chr] = (repeatBpPerChr[chr] || 0) + len;
        const classFamily = cols[10]; // e.g. "LTR/Gypsy", "DNA/hAT-Ac", "LINE/L1"
        const repeatClass = classifyRepeat(classFamily);
        classDistribution[repeatClass] = (classDistribution[repeatClass] || 0) + len;
    }
    const repeatDensity = {};
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
function classifyRepeat(classFamily) {
    const upper = classFamily.toUpperCase();
    if (upper.startsWith('LTR'))
        return 'LTR';
    if (upper.startsWith('LINE'))
        return 'LINE';
    if (upper.startsWith('SINE'))
        return 'SINE';
    if (upper.startsWith('DNA') || upper.includes('TIR') || upper.includes('MITE') || upper.includes('HELITRON') || upper.includes('CACTA') || upper.includes('MULE') || upper.includes('HAT'))
        return 'DNA transposon';
    if (upper.includes('SIMPLE') || upper.includes('LOW_COMPLEXITY') || upper.includes('SATELLITE'))
        return 'Simple/Satellite';
    return 'Other';
}
//# sourceMappingURL=gff-parser.js.map
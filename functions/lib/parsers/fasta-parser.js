"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFasta = parseFasta;
const fs_1 = require("fs");
const readline_1 = require("readline");
async function parseFasta(filePath) {
    const lengths = {};
    let currentSeq = '';
    let totalGC = 0;
    let totalBases = 0;
    const rl = (0, readline_1.createInterface)({
        input: (0, fs_1.createReadStream)(filePath, { encoding: 'utf-8' }),
        crlfDelay: Infinity,
    });
    for await (const line of rl) {
        if (line.startsWith('>')) {
            currentSeq = line.slice(1).split(/\s+/)[0];
            if (!lengths[currentSeq])
                lengths[currentSeq] = 0;
        }
        else if (currentSeq) {
            const seq = line.trim().toUpperCase();
            lengths[currentSeq] += seq.length;
            totalBases += seq.length;
            for (const ch of seq) {
                if (ch === 'G' || ch === 'C')
                    totalGC++;
            }
        }
    }
    const seqNames = Object.keys(lengths);
    const sortedLengths = Object.values(lengths).sort((a, b) => b - a);
    const totalSize = sortedLengths.reduce((a, b) => a + b, 0);
    const n50 = computeN50(sortedLengths, totalSize);
    const chrNames = seqNames.filter((n) => /^chr/i.test(n) || /^[0-9]+$/.test(n));
    return {
        totalSize,
        chromosomeCount: chrNames.length || seqNames.length,
        chromosomeLengths: lengths,
        n50,
        gcPercent: totalBases > 0 ? (totalGC / totalBases) * 100 : 0,
        scaffoldCount: seqNames.length,
    };
}
function computeN50(sortedDesc, total) {
    const half = total / 2;
    let cumulative = 0;
    for (const len of sortedDesc) {
        cumulative += len;
        if (cumulative >= half)
            return len;
    }
    return 0;
}
//# sourceMappingURL=fasta-parser.js.map
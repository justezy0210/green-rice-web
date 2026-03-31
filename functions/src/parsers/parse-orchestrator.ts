import * as admin from 'firebase-admin';
import { parseFasta } from './fasta-parser';
import { parseGeneGff3, parseRepeatOut } from './gff-parser';
import type { GenomeSummary } from '../types/genome-summary';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

const bucket = () => admin.storage().bucket();

async function downloadToTemp(storagePath: string, localName: string): Promise<string> {
  const tempPath = path.join(os.tmpdir(), localName);
  await bucket().file(storagePath).download({ destination: tempPath });
  return tempPath;
}

export async function parseGenomeFiles(
  cultivarId: string,
  files: GenomeSummary['files'],
): Promise<Omit<GenomeSummary, 'status' | 'files' | 'updatedAt'>> {
  const fastaPath = await downloadToTemp(files.genomeFasta.storagePath, `${cultivarId}_genome.fasta`);
  const geneGffPath = await downloadToTemp(files.geneGff3.storagePath, `${cultivarId}_gene.gff3`);
  const repeatOutPath = await downloadToTemp(files.repeatGff.storagePath, `${cultivarId}_repeat.out`);

  try {
    const assembly = await parseFasta(fastaPath);
    const geneAnnotation = await parseGeneGff3(geneGffPath, assembly.chromosomeLengths);
    const repeatAnnotation = await parseRepeatOut(
      repeatOutPath,
      assembly.chromosomeLengths,
      assembly.totalSize,
    );

    return { assembly, geneAnnotation, repeatAnnotation };
  } finally {
    for (const p of [fastaPath, geneGffPath, repeatOutPath]) {
      try { fs.unlinkSync(p); } catch { /* ignore */ }
    }
  }
}

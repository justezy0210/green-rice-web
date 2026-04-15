import type { FileUploadStatus, GenomeSummary } from '@/types/genome';

export function emptyFileStatus(): FileUploadStatus {
  return {
    uploaded: false,
    fileName: '',
    fileSize: 0,
    uploadedAt: '',
    storagePath: '',
  };
}

export function emptyGenomeSummary(): GenomeSummary {
  return {
    status: 'pending',
    updatedAt: '',
    assembly: {
      totalSize: 0,
      chromosomeCount: 0,
      chromosomeLengths: {},
      n50: 0,
      gcPercent: 0,
      scaffoldCount: 0,
    },
    geneAnnotation: {
      geneCount: 0,
      avgGeneLength: 0,
      geneDensity: {},
    },
    repeatAnnotation: {
      totalRepeatLength: 0,
      repeatPercent: 0,
      classDistribution: {},
      repeatDensity: {},
    },
    files: {
      genomeFasta: emptyFileStatus(),
      geneGff3: emptyFileStatus(),
      repeatGff: emptyFileStatus(),
    },
  };
}

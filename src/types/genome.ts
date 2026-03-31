export interface FileUploadStatus {
  uploaded: boolean;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  storagePath: string;
}

export interface GenomeSummary {
  status: 'pending' | 'processing' | 'complete' | 'error';
  errorMessage?: string;
  updatedAt: string;
  assembly: {
    totalSize: number;
    chromosomeCount: number;
    chromosomeLengths: Record<string, number>;
    n50: number;
    gcPercent: number;
    scaffoldCount: number;
  };
  geneAnnotation: {
    geneCount: number;
    avgGeneLength: number;
    geneDensity: Record<string, number>;
  };
  repeatAnnotation: {
    totalRepeatLength: number;
    repeatPercent: number;
    classDistribution: Record<string, number>;
    repeatDensity: Record<string, number>;
  };
  files: {
    genomeFasta: FileUploadStatus;
    geneGff3: FileUploadStatus;
    repeatGff: FileUploadStatus;
  };
}

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

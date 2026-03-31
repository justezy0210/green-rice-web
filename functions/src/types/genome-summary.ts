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

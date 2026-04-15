# Database Schema (auto-generated reference)

> Source of truth: `src/types/cultivar.ts`, `src/types/genome.ts`

## Collection: `cultivars`

Document ID: `cultivarNameToId(name)` (lowercase, spaces → hyphens)

```typescript
{
  name: string;
  daysToHeading: {
    early: number | null;
    normal: number | null;
    late: number | null;
  };
  morphology: {
    culmLength: number | null;
    panicleLength: number | null;
    panicleNumber: number | null;
  };
  yield: {
    spikeletsPerPanicle: number | null;
    ripeningRate: number | null;
  };
  quality: {
    grainWeight: number | null;
    preHarvestSprouting: number | null;
  };
  resistance: {
    bacterialLeafBlight: {
      k1: boolean | null;
      k2: boolean | null;
      k3: boolean | null;
      k3a: boolean | null;
    };
  };
  crossInformation: string;
  genomeSummary?: {
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
  };
}
```

## Collection: `groupings`

Document ID: `traitId` (snake_case, e.g. `heading_date`, `culm_length`).
Public read, write only via Cloud Functions.

```typescript
{
  summary: {
    traitId: string;
    method: 'gmm' | 'fixed-class' | 'none';
    nGroups: number;
    scoreMetric: 'silhouette' | 'bic' | 'none';
    scoreValue: number;
    version: number;
    updatedAt: string;
  };
  quality: {
    traitId: string;
    nObserved: number;
    nUsedInModel: number;
    missingRate: number;
    usable: boolean;
    note: string;
  };
  assignments: {
    [cultivarId: string]: {
      groupLabel: string;
      probability: number;
      confidence: 'high' | 'medium' | 'borderline';
      borderline: boolean;
      indexScore: number;
    };
  };
}
```

## Collection: `_grouping_meta` (internal)

Not publicly readable. Used by the grouping Cloud Function for lock/version tracking.

```typescript
// Document: _grouping_meta/lock
{
  status: 'idle' | 'running';
  leaseExpiresAt: string | null;  // ISO timestamp
  completedAt: string;
  version: number;
  phenotypeHash: string;
}
```

## Type: `FileUploadStatus`

```typescript
{
  uploaded: boolean;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  storagePath: string;
}
```

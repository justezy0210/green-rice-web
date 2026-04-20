/**
 * Types for the gene → orthogroup reverse index produced by
 * scripts/build-gene-og-index.py.
 *
 * The index is partitioned by the first 2 alphanumeric characters of
 * the gene ID (uppercased). Each partition holds ~tens of thousands of
 * gene rows and is 2–6 MB of JSON — lazy-loaded on demand.
 */

export interface GeneIndexEntry {
  og: string;
  cultivar: string;
}

export interface GeneIndexPartition {
  version: number;
  prefix: string;
  entries: Record<string, GeneIndexEntry>;
}

export interface GeneIndexManifestPartition {
  path: string;
  geneCount: number;
}

export interface GeneIndexManifest {
  schemaVersion: 1;
  orthofinderVersion: number;
  builtAt: string;
  totalGenes: number;
  partitions: Record<string, GeneIndexManifestPartition>;
}

/** First two alphanumeric chars of a gene id, uppercased. */
export function prefixForGeneId(geneId: string): string {
  const s = geneId.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase();
  return s.length === 2 ? s : '__';
}

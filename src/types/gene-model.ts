/**
 * Types for the gene_models/v{N}/ precompute (scripts/build-gene-models.py).
 *
 * Each gene carries ONE representative transcript (longest total CDS)
 * with exon regions already subtracted into UTR5 / CDS / UTR3 lists.
 * Functional annotation is extracted from the mRNA attributes
 * (funannotate + eggNOG + InterPro via Dbxref/note/Ontology_term).
 */

export interface GeneExonSegment {
  start: number;
  end: number;
}

export interface GeneTranscript {
  id: string;
  utr5: GeneExonSegment[];
  cds: GeneExonSegment[];
  utr3: GeneExonSegment[];
}

export interface GeneAnnotation {
  product?: string;
  go?: string[];
  pfam?: string[];
  interpro?: string[];
  cog?: string;
  eggnog?: string;
}

export interface GeneModelEntry {
  cultivar: string;
  chr: string;
  start: number;
  end: number;
  strand: string; // '+' | '-'
  transcript: GeneTranscript;
  annotation: GeneAnnotation;
}

export interface GeneModelPartition {
  version: number;
  prefix: string;
  genes: Record<string, GeneModelEntry>;
}

export interface GeneModelManifestPartition {
  path: string;
  geneCount: number;
}

export interface GeneModelManifest {
  schemaVersion: 1;
  orthofinderVersion: number;
  builtAt: string;
  totalGenes: number;
  cultivars: Record<string, number>;
  partitions: Record<string, GeneModelManifestPartition>;
}

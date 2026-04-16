/**
 * TS-only types for Storage artifacts produced by the orthofinder pipeline.
 * Cloud Functions (Python) write these files; the frontend reads them.
 * NOT mirrored in Python — the functions side uses its own structures.
 */

export interface OgMembersChunk {
  chunk: string;                                      // "000", "001", ...
  ogs: Record<string, Record<string, string[]>>;     // ogId → cultivarId → gene[]
}

export interface BaegilmiGeneInfo {
  chromosome: string;
  start: number;
  end: number;
  strand: '+' | '-' | '.';
  attributes: Record<string, string>;
}

/**
 * Shape of baegilmi_gene_annotation.json
 * (produced by load_baegilmi_gene_annotation() in functions-python).
 */
export interface BaegilmiGeneAnnotation {
  genes: Record<string, BaegilmiGeneInfo>;
  transcript_to_gene: Record<string, string>;
}

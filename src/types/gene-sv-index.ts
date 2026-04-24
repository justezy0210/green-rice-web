/**
 * Gene → SV overlap evidence index (scripts/build-gene-sv-index.py).
 *
 * Per-gene summary of sample-frame SV overlap evidence used by the Gene
 * search row badge. The index is intentionally evidence-graded, not a
 * functional-impact call: each entry records whether the gene has
 * canonical SV footprint hitting its representative transcript CDS or
 * canonical splice sites (strong tier), or only weaker overlap
 * (UTR / intron / flanking — weak tier). Raw counts are limited to a
 * deduped locus count in the strong tier; no per-type chip is exposed
 * in this schema version because the canonical `svType` on the event
 * is ALT0-based and can mistype multi-allelic carriers.
 *
 * Short keys keep the bundle small across ~400 k genes:
 *   s  1 = strong tier hit (CDS or canonical splice ±2 bp), 0 = none
 *   w  1 = weak tier hit only (UTR / intron / ±2 kb flank), 0 = none
 *   n  deduped strong-tier locus count (>=1 when s=1)
 *   t  types present in strong tier: any subset of 'I' (INS), 'D' (DEL), 'C' (COMPLEX)
 *   c  panel carrier count — number of cultivars in the same OG with strong-tier overlap
 */

export interface GeneSvEntry {
  /** 1 = strong tier present (CDS exon or canonical splice site ±2 bp). */
  s: 0 | 1;
  /** 1 = weak tier present (UTR / intron / ±2 kb flanking) without strong. */
  w: 0 | 1;
  /** Deduped locus count in strong tier. */
  n: number;
  /** Concatenation of 'I' (INS), 'D' (DEL), 'C' (COMPLEX) in strong tier. */
  t: string;
  /** Panel carriers in same OG with strong-tier overlap (tooltip only). */
  c: number;
}

export interface GeneSvIndex {
  schemaVersion: 1;
  orthofinderVersion: number;
  /** Carried for diagnostic traceability. Not used by the FE key today
   * because gene_models currently versions lockstep with orthofinder. */
  geneModelVersion?: number;
  svReleaseId: string;
  builtAt: string;
  /** geneId → entry. Genes with neither strong nor weak tier are omitted. */
  genes: Record<string, GeneSvEntry>;
}

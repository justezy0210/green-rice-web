/**
 * Compact functional search index (scripts/build-functional-search-index.py).
 *
 * Single-file Phase-1 MVP. Served gzipped from Firebase Storage at
 * functional_index/v{N}/index.json.
 *
 * Row shape uses short keys to minimize wire size:
 *   g  gene id (funannotate gene-level)
 *   t  transcript id (gene id + ".tN")
 *   c  cultivar
 *   og orthogroup id (optional; may be missing if gene is in no OG)
 *   p  product (lowercased; "hypothetical protein" is stored as null/missing)
 *   pf Pfam accessions (e.g., "PF00566")
 *   ip InterPro accessions (e.g., "IPR035969")
 *   go GO terms, "GO:" prefix stripped for bytes (e.g., "0090630")
 *
 * Inverted indexes (idx) map code → rowIds for O(1) exact lookup on
 * Pfam / InterPro / GO. Product is scanned as a normalized substring.
 */

export interface FunctionalRow {
  g: string;
  t: string;
  c: string;
  og?: string;
  p?: string;
  pf?: string[];
  ip?: string[];
  go?: string[];
}

export interface FunctionalIndex {
  schemaVersion: 1;
  orthofinderVersion: number;
  builtAt: string;
  annotatedCultivars: string[];
  rowCount: number;
  rows: FunctionalRow[];
  idx: {
    pf: Record<string, number[]>;
    ip: Record<string, number[]>;
    go: Record<string, number[]>;
  };
}

export type SearchMode =
  | 'idle'
  | 'gene-id'
  | 'pfam'
  | 'interpro'
  | 'go'
  | 'product';

/**
 * Classify a search query by shape. Hard routing for Phase-1 MVP —
 * exactly one search source per query.
 *
 *   "baegilmi_g42643"        → gene-id
 *   "baegilmi_g42643.t1"     → gene-id
 *   "PF00069"                → pfam
 *   "IPR001234"              → interpro
 *   "GO:0090630"             → go
 *   "glutelin" / "kinase"    → product (substring, ≥ 2 chars)
 */
export function routeQuery(raw: string): SearchMode {
  const q = raw.trim();
  if (q.length === 0) return 'idle';
  const lower = q.toLowerCase();
  if (/^[a-z][a-z0-9]*_g\d+(\.t\d+)?$/.test(lower)) return 'gene-id';
  if (/^pf\d{5}$/.test(lower)) return 'pfam';
  if (/^ipr\d{6}$/.test(lower)) return 'interpro';
  if (/^go:\d{7}$/.test(lower)) return 'go';
  if (q.length >= 2) return 'product';
  return 'idle';
}

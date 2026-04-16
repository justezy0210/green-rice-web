/**
 * Functional categorization for orthogroup representatives.
 *
 * Two modes:
 *   1. **Precomputed (LLM)** — reads `og_categories.json` from Storage (batch-classified
 *      via GPT). Each OG has a primary + optional secondary category.
 *   2. **Regex fallback** — client-side keyword matching when precomputed data is unavailable.
 *
 * Every entry is assigned to exactly one primary category for display.
 * Categories are addressed by `id` for deterministic filtering.
 */

import type { OrthogroupDiffEntry } from '@/types/orthogroup';
import type { OgCategoriesData } from '@/lib/orthogroup-service';

export type CategoryId =
  | 'kinase'
  | 'receptor'
  | 'tf'
  | 'signaling'
  | 'transporter'
  | 'defense'
  | 'photosynthesis'
  | 'flowering'
  | 'starch'
  | 'cell_wall'
  | 'transposon'
  | 'ribosomal'
  | 'metabolism'
  | 'structural'
  | 'ubiquitin'
  | 'repeat_domain'
  | 'hypothetical'
  | 'other'
  | 'no_annotation';

export interface FunctionalCategory {
  id: CategoryId;
  label: string;
  color: string;
}

const CATEGORY_DEFS: Record<CategoryId, FunctionalCategory> = {
  kinase: { id: 'kinase', label: 'Kinase / signaling', color: 'rgba(59, 130, 246, 0.75)' },
  receptor: { id: 'receptor', label: 'Receptor', color: 'rgba(236, 72, 153, 0.75)' },
  tf: { id: 'tf', label: 'Transcription factor', color: 'rgba(168, 85, 247, 0.75)' },
  signaling: { id: 'signaling', label: 'Signal transduction', color: 'rgba(99, 102, 241, 0.75)' },
  transporter: { id: 'transporter', label: 'Transporter / channel', color: 'rgba(14, 165, 233, 0.75)' },
  defense: { id: 'defense', label: 'Resistance / defense', color: 'rgba(239, 68, 68, 0.75)' },
  photosynthesis: { id: 'photosynthesis', label: 'Photosynthesis / plastid', color: 'rgba(34, 197, 94, 0.75)' },
  flowering: { id: 'flowering', label: 'Flowering / development', color: 'rgba(244, 114, 182, 0.75)' },
  starch: { id: 'starch', label: 'Starch / grain quality', color: 'rgba(251, 191, 36, 0.75)' },
  cell_wall: { id: 'cell_wall', label: 'Cell wall / structural', color: 'rgba(132, 204, 22, 0.75)' },
  transposon: { id: 'transposon', label: 'Transposon', color: 'rgba(120, 113, 108, 0.75)' },
  ribosomal: { id: 'ribosomal', label: 'Ribosomal / translation', color: 'rgba(249, 115, 22, 0.75)' },
  metabolism: { id: 'metabolism', label: 'Metabolism / enzyme', color: 'rgba(20, 184, 166, 0.75)' },
  structural: { id: 'structural', label: 'Cytoskeleton / chromatin', color: 'rgba(139, 92, 246, 0.75)' },
  ubiquitin: { id: 'ubiquitin', label: 'Ubiquitin / proteasome', color: 'rgba(217, 70, 239, 0.75)' },
  repeat_domain: { id: 'repeat_domain', label: 'Repeat domain (PPR/LRR/WD40)', color: 'rgba(6, 182, 212, 0.75)' },
  hypothetical: { id: 'hypothetical', label: 'Hypothetical / unknown', color: 'rgba(156, 163, 175, 0.75)' },
  other: { id: 'other', label: 'Other', color: 'rgba(107, 114, 128, 0.55)' },
  no_annotation: { id: 'no_annotation', label: 'No IRGSP annotation', color: 'rgba(229, 231, 235, 0.9)' },
};

export const ALL_CATEGORIES: FunctionalCategory[] = Object.values(CATEGORY_DEFS);

export function getCategoryById(id: string): FunctionalCategory | null {
  return CATEGORY_DEFS[id as CategoryId] ?? null;
}

export function isCategoryId(v: string | null | undefined): v is CategoryId {
  return !!v && v in CATEGORY_DEFS;
}

// ─────────────────────────────────────────────────────────────
// Precomputed (LLM) classification
// ─────────────────────────────────────────────────────────────

export function categorizeEntryPrecomputed(
  entry: OrthogroupDiffEntry,
  categories: OgCategoriesData,
): FunctionalCategory {
  const cat = categories.categories[entry.orthogroup];
  if (cat) {
    const id = cat.p as CategoryId;
    return CATEGORY_DEFS[id] ?? CATEGORY_DEFS.other;
  }
  // Not in precomputed → check if it has annotation at all
  if (!entry.representative) return CATEGORY_DEFS.no_annotation;
  const descs = Object.values(entry.representative.descriptions ?? {}).filter(
    (d) => d && d !== 'NA',
  );
  return descs.length === 0 ? CATEGORY_DEFS.no_annotation : CATEGORY_DEFS.other;
}

export function getSecondaryCategory(
  entry: OrthogroupDiffEntry,
  categories: OgCategoriesData,
): FunctionalCategory | null {
  const cat = categories.categories[entry.orthogroup];
  if (cat?.s) {
    const id = cat.s as CategoryId;
    return CATEGORY_DEFS[id] ?? null;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// Regex fallback (used when og_categories.json is not available)
// ─────────────────────────────────────────────────────────────

const FALLBACK_RULES: { id: CategoryId; pattern: RegExp }[] = [
  { id: 'kinase', pattern: /\b(kinase|phosphatase|MAPK|CDPK)\b/i },
  { id: 'tf', pattern: /\b(transcription factor|MYB|WRKY|bZIP|bHLH|NAC domain|homeobox|AP2)\b/i },
  { id: 'transporter', pattern: /\b(transporter|channel|permease|aquaporin|ABC[- ]?transporter)\b/i },
  { id: 'defense', pattern: /\b(disease resistance|NBS-?LRR|NB-?ARC|pathogenesis|defense|immune)\b/i },
  { id: 'transposon', pattern: /\b(transposon|retrotransposon|transposable|reverse transcriptase)\b/i },
  { id: 'ribosomal', pattern: /\b(ribosomal|ribosome|translation|tRNA|rRNA)\b/i },
  { id: 'receptor', pattern: /\breceptor\b/i },
  { id: 'cell_wall', pattern: /\b(cell wall|cellulose|pectin|expansin|xyloglucan)\b/i },
  { id: 'metabolism', pattern: /\b(oxidase|reductase|dehydrogenase|hydrolase|transferase|synthase|ligase|isomerase|P450|cytochrome)\b/i },
  { id: 'hypothetical', pattern: /\b(hypothetical|unknown|uncharacterized|expressed protein)\b/i },
];

function entryText(entry: OrthogroupDiffEntry): string | null {
  const rep = entry.representative;
  if (!rep) return null;
  const descs = Object.values(rep.descriptions ?? {}).filter((d) => d && d !== 'NA');
  return descs.length > 0 ? descs.join(' ') : null;
}

function categorizeEntryRegex(entry: OrthogroupDiffEntry): FunctionalCategory {
  const text = entryText(entry);
  if (text === null) return CATEGORY_DEFS.no_annotation;
  for (const rule of FALLBACK_RULES) {
    if (rule.pattern.test(text)) return CATEGORY_DEFS[rule.id];
  }
  return CATEGORY_DEFS.other;
}

// ─────────────────────────────────────────────────────────────
// Public API — auto-selects precomputed vs regex
// ─────────────────────────────────────────────────────────────

export function categorizeEntry(
  entry: OrthogroupDiffEntry,
  precomputed?: OgCategoriesData | null,
): FunctionalCategory {
  if (precomputed) return categorizeEntryPrecomputed(entry, precomputed);
  return categorizeEntryRegex(entry);
}

export interface CategoryCount {
  category: FunctionalCategory;
  count: number;
}

export function countEntriesByCategory(
  entries: OrthogroupDiffEntry[],
  precomputed?: OgCategoriesData | null,
): CategoryCount[] {
  const buckets = new Map<string, CategoryCount>();
  for (const e of entries) {
    const cat = categorizeEntry(e, precomputed);
    const prev = buckets.get(cat.id);
    if (prev) prev.count += 1;
    else buckets.set(cat.id, { category: cat, count: 1 });
  }
  return Array.from(buckets.values()).sort((a, b) => b.count - a.count);
}

export function filterByCategory(
  entries: OrthogroupDiffEntry[],
  categoryId: CategoryId,
  precomputed?: OgCategoriesData | null,
): OrthogroupDiffEntry[] {
  return entries.filter((e) => categorizeEntry(e, precomputed).id === categoryId);
}

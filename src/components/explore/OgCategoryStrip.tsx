import { useMemo } from 'react';
import { getCategoryById, type CategoryId } from '@/lib/og-functional-categories';
import type { OgCategoriesData } from '@/lib/orthogroup-service';
import type { OgIndexRow } from '@/lib/og-index-service';

interface Props {
  rows: OgIndexRow[];
  categories: OgCategoriesData | null;
  selected: CategoryId | null;
  onSelect: (id: CategoryId | null) => void;
}

interface Bucket {
  id: CategoryId;
  label: string;
  color: string;
  count: number;
}

const ORDERED: CategoryId[] = [
  'kinase', 'receptor', 'tf', 'signaling',
  'transporter', 'defense', 'photosynthesis', 'flowering',
  'starch', 'cell_wall', 'transposon', 'ribosomal',
  'metabolism', 'structural', 'ubiquitin', 'repeat_domain',
  'hypothetical', 'other', 'no_annotation',
];

/**
 * Compact functional category strip for the OG entity browser. Counts
 * are derived from the precomputed `og_categories` lookup (LLM
 * classification of the orthogroup's representative gene). Click a
 * chip to filter the table; click again to clear.
 */
export function OgCategoryStrip({
  rows, categories, selected, onSelect,
}: Props) {
  const buckets = useMemo<Bucket[]>(() => {
    const counts = new Map<CategoryId, number>();
    for (const og of rows) {
      const primary = categories?.categories[og.ogId]?.p ?? null;
      const id = (primary ?? 'no_annotation') as CategoryId;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    const result: Bucket[] = [];
    for (const id of ORDERED) {
      const c = counts.get(id) ?? 0;
      if (c === 0) continue;
      const def = getCategoryById(id);
      if (!def) continue;
      result.push({ id, label: def.label, color: def.color, count: c });
    }
    return result;
  }, [rows, categories]);

  if (!categories) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-wide text-gray-500 mr-1">
        Function
      </span>
      {buckets.map((b) => {
        const active = selected === b.id;
        return (
          <button
            key={b.id}
            type="button"
            onClick={() => onSelect(active ? null : b.id)}
            className={`text-[11px] px-2 py-[2px] rounded border inline-flex items-center gap-1 ${
              active
                ? 'border-green-400 bg-green-50 text-green-800 font-medium'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
            title={b.label}
          >
            <span
              className="inline-block w-2 h-2 rounded-sm shrink-0"
              style={{ backgroundColor: b.color }}
            />
            <span>{b.label}</span>
            <span className="text-[10px] tabular-nums text-gray-500">
              {b.count.toLocaleString()}
            </span>
          </button>
        );
      })}
    </div>
  );
}

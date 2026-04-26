import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  countEntriesByCategory,
  type CategoryId,
} from '@/lib/og-functional-categories';
import type { OgCategoriesData } from '@/lib/orthogroup-service';
import type { OrthogroupDiffEntry } from '@/types/orthogroup';

interface Props {
  entries: OrthogroupDiffEntry[];
  activeCategory?: CategoryId | null;
  onCategorySelect?: (id: CategoryId) => void;
  precomputed?: OgCategoriesData | null;
}

export function OgFunctionCategoriesChart({ entries, activeCategory, onCategorySelect, precomputed }: Props) {
  const counts = useMemo(
    () => countEntriesByCategory(entries, precomputed),
    [entries, precomputed],
  );

  if (entries.length === 0 || counts.length === 0) return null;

  const max = Math.max(...counts.map((c) => c.count));

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm">Candidate annotation categories</CardTitle>
          <span className="text-xs text-gray-500">
            {entries.length.toLocaleString()} OGs · {precomputed ? 'LLM-proposed' : 'keyword heuristics'}
          </span>
        </div>
        <p className="text-[10px] text-gray-400 mt-1">
          Convenience grouping of the current candidate list, not trait-level enrichment.
        </p>
      </CardHeader>
      <CardContent className="py-2 flex-1 flex flex-col justify-between">
        <ul className="space-y-1">
          {counts.map((c) => {
            const pct = (c.count / max) * 100;
            const active = activeCategory === c.category.id;
            const Row = (
              <div className="flex items-center gap-2 text-xs">
                <span className="w-40 shrink-0 truncate text-gray-700">{c.category.label}</span>
                <div className="flex-1 h-4 bg-gray-50 rounded-sm overflow-hidden relative">
                  <div
                    className="h-full rounded-sm transition-[width]"
                    style={{ width: `${pct}%`, backgroundColor: c.category.color }}
                  />
                </div>
                <span className="w-12 shrink-0 text-right tabular-nums text-gray-600">
                  {c.count.toLocaleString()}
                </span>
              </div>
            );
            return (
              <li key={c.category.id}>
                {onCategorySelect ? (
                  /* raw: full-width row-as-button with category swatch + bar — Button primitive doesn't fit. */
                  <button
                    type="button"
                    onClick={() => onCategorySelect(c.category.id)}
                    aria-pressed={active}
                    className={`w-full text-left rounded px-1 -mx-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-green-200 ${
                      active ? 'bg-green-50 ring-1 ring-green-200' : 'hover:bg-gray-50'
                    }`}
                    title={`Filter table by ${c.category.label}`}
                  >
                    {Row}
                  </button>
                ) : (
                  <div className="px-1 -mx-1 py-0.5">{Row}</div>
                )}
              </li>
            );
          })}
        </ul>
        <p className="text-[10px] text-gray-400 mt-2">
          {precomputed ? 'LLM-derived convenience classification (GPT-5.4)' : 'Keyword heuristics'} — not formal GO/InterPro annotation. Click a row to filter the table.
        </p>
      </CardContent>
    </Card>
  );
}

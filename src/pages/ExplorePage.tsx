import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TraitSelector } from '@/components/explore/TraitSelector';
import { GroupingSummaryCard } from '@/components/explore/GroupingSummaryCard';
import { OrthogroupDiffTable, type DiffSortKey } from '@/components/explore/OrthogroupDiffTable';
import { OgDrawer } from '@/components/explore/OgDrawer';
import { OgFunctionCategoriesChart } from '@/components/explore/OgFunctionCategoriesChart';
import { isCategoryId, type CategoryId } from '@/lib/og-functional-categories';
import { useOrthogroupDiff } from '@/hooks/useOrthogroupDiff';
import { useOrthogroupDiffEntries } from '@/hooks/useOrthogroupDiffEntries';
import { useOgCategories } from '@/hooks/useOgCategories';
import { useCultivars } from '@/hooks/useCultivars';
import type { TraitId } from '@/types/grouping';

const VALID_TRAITS: TraitId[] = [
  'heading_date',
  'culm_length',
  'panicle_length',
  'panicle_number',
  'spikelets_per_panicle',
  'ripening_rate',
  'grain_weight',
  'pre_harvest_sprouting',
  'bacterial_leaf_blight',
];

const PAGE_SIZE = 20;
const VALID_SORT: DiffSortKey[] = ['p', 'meanDiff', 'log2FC'];

function isTraitId(v: string | null): v is TraitId {
  return v !== null && (VALID_TRAITS as string[]).includes(v);
}
function isSortKey(v: string | null): v is DiffSortKey {
  return v !== null && (VALID_SORT as string[]).includes(v);
}

const DEFAULT_TRAIT: TraitId = 'heading_date';

export function ExplorePage() {
  const [params, setParams] = useSearchParams();
  const rawTrait = params.get('trait');
  const traitId: TraitId = isTraitId(rawTrait) ? rawTrait : DEFAULT_TRAIT;
  const ogId = params.get('og');
  const page = Math.max(0, parseInt(params.get('page') ?? '0', 10) || 0);
  const sortKey: DiffSortKey = isSortKey(params.get('sort')) ? (params.get('sort') as DiffSortKey) : 'p';
  const query = params.get('q') ?? '';
  const rawCategory = params.get('category');
  const category: CategoryId | null = isCategoryId(rawCategory) ? rawCategory : null;

  const { doc, groupingDoc, isStale, loading } = useOrthogroupDiff(traitId);
  const entriesState = useOrthogroupDiffEntries(doc);
  const ogCategories = useOgCategories(doc?.orthofinderVersion ?? null);
  const { cultivars } = useCultivars();

  const cultivarNameMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of cultivars) m[c.id] = c.name;
    return m;
  }, [cultivars]);

  const setTrait = useCallback(
    (id: TraitId) => {
      setParams(
        (prev) => {
          prev.set('trait', id);
          prev.delete('og');
          prev.delete('page');
          return prev;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const openOg = useCallback(
    (id: string) => {
      setParams((prev) => {
        prev.set('og', id);
        return prev;
      });
    },
    [setParams],
  );

  const closeOg = useCallback(() => {
    setParams((prev) => {
      prev.delete('og');
      return prev;
    });
  }, [setParams]);

  const onPageChange = useCallback(
    (p: number) => {
      setParams((prev) => {
        if (p === 0) prev.delete('page');
        else prev.set('page', String(p));
        return prev;
      });
    },
    [setParams],
  );

  const onSortChange = useCallback(
    (k: DiffSortKey) => {
      setParams((prev) => {
        if (k === 'p') prev.delete('sort');
        else prev.set('sort', k);
        prev.delete('page');
        return prev;
      });
    },
    [setParams],
  );

  const onQueryChange = useCallback(
    (q: string) => {
      setParams(
        (prev) => {
          if (q) prev.set('q', q);
          else prev.delete('q');
          prev.delete('page');
          return prev;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const onCategoryChange = useCallback(
    (id: CategoryId | null) => {
      setParams((prev) => {
        // Toggle off if clicking the currently-active category
        const current = prev.get('category');
        if (!id || current === id) prev.delete('category');
        else prev.set('category', id);
        prev.delete('page');
        return prev;
      });
    },
    [setParams],
  );


  return (
    <div className="space-y-6 pb-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <div className="flex flex-col gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Explore Candidates</h1>
            <p className="text-sm text-gray-500 mt-1">
              Phenotype-driven exploration: pick a trait and see orthogroups differing most between groups.
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Trait</label>
            <TraitSelector value={traitId} onChange={setTrait} />
          </div>
          <GroupingSummaryCard
            className="flex-1"
            groupingDoc={groupingDoc}
            cultivarNameMap={cultivarNameMap}
          />
        </div>
        {entriesState.kind === 'ready' && (
          <OgFunctionCategoriesChart
            entries={entriesState.payload.entries}
            activeCategory={category}
            onCategorySelect={onCategoryChange}
            precomputed={ogCategories}
          />
        )}
        {entriesState.kind === 'legacy' && (
          <OgFunctionCategoriesChart
            entries={entriesState.entries}
            activeCategory={category}
            onCategorySelect={onCategoryChange}
            precomputed={ogCategories}
          />
        )}
      </div>
      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <OrthogroupDiffTable
          doc={doc}
          entriesState={entriesState}
          isStale={isStale}
          page={page}
          pageSize={PAGE_SIZE}
          sortKey={sortKey}
          query={query}
          category={category}
          precomputed={ogCategories}
          onPageChange={onPageChange}
          onSortChange={onSortChange}
          onQueryChange={onQueryChange}
          onCategoryChange={onCategoryChange}
          onSelectOg={openOg}
        />
      )}

      <OgDrawer
        ogId={ogId}
        diffDoc={doc}
        entriesState={entriesState}
        cultivarNameMap={cultivarNameMap}
        groupByCultivar={groupingDoc?.assignments ?? null}
        onClose={closeOg}
      />
    </div>
  );
}

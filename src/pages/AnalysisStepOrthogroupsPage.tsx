import { useCallback, useMemo } from 'react';
import { useParams, useSearchParams, Navigate } from 'react-router-dom';
import { AnalysisShell } from '@/components/analysis/AnalysisShell';
import { useAnalysisRun } from '@/hooks/useAnalysisRun';
import { isValidRunId, decodeRunId } from '@/lib/analysis-run-id';
import { useOrthogroupDiff } from '@/hooks/useOrthogroupDiff';
import { useOrthogroupDiffEntries } from '@/hooks/useOrthogroupDiffEntries';
import { useOgCategories } from '@/hooks/useOgCategories';
import { useOgAlleleFreq } from '@/hooks/useOgAlleleFreq';
import { OrthogroupDiffTable, type DiffSortKey } from '@/components/explore/OrthogroupDiffTable';
import { isCategoryId, type CategoryId } from '@/lib/og-functional-categories';

const PAGE_SIZE = 20;
const VALID_SORT: DiffSortKey[] = ['p', 'log2FC'];

function isSortKey(v: string | null): v is DiffSortKey {
  return v !== null && (VALID_SORT as string[]).includes(v);
}

export function AnalysisStepOrthogroupsPage() {
  const { runId } = useParams<{ runId: string }>();
  const validRunId = runId && isValidRunId(runId) ? runId : null;
  const parts = validRunId ? decodeRunId(validRunId) : null;
  const traitId = parts?.traitId ?? null;

  const [params, setParams] = useSearchParams();
  const page = Math.max(0, parseInt(params.get('page') ?? '0', 10) || 0);
  const sortKey: DiffSortKey = isSortKey(params.get('sort')) ? (params.get('sort') as DiffSortKey) : 'p';
  const query = params.get('q') ?? '';
  const rawCategory = params.get('category');
  const category: CategoryId | null = isCategoryId(rawCategory) ? rawCategory : null;

  const { run, error } = useAnalysisRun(validRunId);
  const { doc, isStale, loading } = useOrthogroupDiff(traitId);
  const entriesState = useOrthogroupDiffEntries(doc);
  const ogCategories = useOgCategories(doc?.orthofinderVersion ?? null);
  const alleleFreq = useOgAlleleFreq(
    traitId,
    doc?.orthofinderVersion ?? null,
    doc?.groupingVersion ?? null,
  );

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
        const current = prev.get('category');
        if (!id || current === id) prev.delete('category');
        else prev.set('category', id);
        prev.delete('page');
        return prev;
      });
    },
    [setParams],
  );

  const onSelectOg = useCallback(
    (ogId: string) => {
      window.location.assign(`/og/${encodeURIComponent(ogId)}?trait=${traitId}`);
    },
    [traitId],
  );

  const content = useMemo(() => {
    if (loading) return <p className="text-sm text-gray-400">Loading orthogroup ranking…</p>;
    return (
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
        alleleFreq={alleleFreq}
        onPageChange={onPageChange}
        onSortChange={onSortChange}
        onQueryChange={onQueryChange}
        onCategoryChange={onCategoryChange}
        onSelectOg={onSelectOg}
      />
    );
  }, [loading, doc, entriesState, isStale, page, sortKey, query, category, ogCategories, alleleFreq, onPageChange, onSortChange, onQueryChange, onCategoryChange, onSelectOg]);

  if (!validRunId) return <Navigate to="/analysis" replace />;
  if (error || !run) {
    return (
      <div className="py-10 text-center text-sm text-gray-500">
        {error?.message ?? 'Run not found.'}
      </div>
    );
  }

  return (
    <AnalysisShell runId={validRunId} stepAvailability={run.stepAvailability}>
      <div className="space-y-4">
        <header>
          <h1 className="text-xl font-semibold text-gray-900">Step 2 — Orthogroups</h1>
          <p className="text-sm text-gray-600 mt-1">
            OG ranking by copy-count contrast between proposed phenotype groups.
            Click a row to open the OG detail page with the trait context
            preserved.
          </p>
        </header>
        {content}
      </div>
    </AnalysisShell>
  );
}

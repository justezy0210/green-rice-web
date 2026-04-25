import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { OrthogroupDiffPagination } from './OrthogroupDiffPagination';
import { OrthogroupDiffRow } from './OrthogroupDiffRow';
import { OrthogroupDiffSortButton } from './OrthogroupDiffSortButton';
import {
  categorizeEntry,
  getCategoryById,
  type CategoryId,
} from '@/lib/og-functional-categories';
import {
  extractEntries,
  filterByQuery,
  sortEntries,
  type DiffSortKey,
} from '@/lib/og-diff-filters';
import type { OgCategoriesData } from '@/lib/orthogroup-service';
import type {
  DiffEntriesState,
  OgAlleleFreqPayload,
  OrthogroupDiffDocument,
  SelectionMode,
} from '@/types/orthogroup';
import { PANEL_LABEL } from '@/config/panel';
import { IRGSP_DISPLAY_NAME } from '@/lib/irgsp-constants';

export type { DiffSortKey };

interface Props {
  doc: OrthogroupDiffDocument | null;
  entriesState: DiffEntriesState;
  isStale: boolean;
  page: number;
  pageSize: number;
  sortKey: DiffSortKey;
  query: string;
  category: CategoryId | null;
  precomputed?: OgCategoriesData | null;
  alleleFreq?: OgAlleleFreqPayload | null;
  onPageChange: (page: number) => void;
  onSortChange: (key: DiffSortKey) => void;
  onQueryChange: (q: string) => void;
  onCategoryChange: (id: CategoryId | null) => void;
  onSelectOg?: (ogId: string) => void;
}

export function OrthogroupDiffTable({
  doc,
  entriesState,
  isStale,
  page,
  pageSize,
  sortKey,
  query,
  category,
  precomputed,
  alleleFreq,
  onPageChange,
  onSortChange,
  onQueryChange,
  onCategoryChange,
  onSelectOg,
}: Props) {
  const entries = useMemo(() => extractEntries(entriesState), [entriesState]);
  const byCategory = useMemo(
    () => (category ? entries.filter((e) => categorizeEntry(e, precomputed).id === category) : entries),
    [entries, category, precomputed],
  );
  const filtered = useMemo(() => filterByQuery(byCategory, query), [byCategory, query]);
  const sorted = useMemo(() => sortEntries(filtered, sortKey, alleleFreq), [filtered, sortKey, alleleFreq]);
  const activeCategoryLabel = category ? getCategoryById(category)?.label ?? category : null;
  const pageRows = useMemo(
    () => sorted.slice(page * pageSize, (page + 1) * pageSize),
    [sorted, page, pageSize],
  );

  if (!doc) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-gray-400 text-center">
          No orthogroup differential data. Upload OrthoFinder results in the admin panel.
        </CardContent>
      </Card>
    );
  }

  const groupLabels = doc.groupLabels;
  const hasStats = doc.selectionMode !== undefined && doc.thresholds !== undefined;
  const modeBanner = hasStats
    ? describeMode(doc.selectionMode, doc.thresholds.pValue, doc.thresholds.meanDiff)
    : {
        text: 'Legacy data (pre-statistics). Trigger a recompute by re-uploading OrthoFinder files or editing a cultivar.',
        cls: 'bg-amber-50 border-amber-200 text-amber-800',
      };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm">Candidate Orthogroups</CardTitle>
          {hasStats && (
            <span className="text-xs text-gray-500">
              {doc.passedCount.toLocaleString()} copy-count candidates of {doc.totalTested.toLocaleString()} orthogroups tested (Mann-Whitney U)
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-[11px] text-gray-600 bg-gray-50 border border-gray-200 rounded px-3 py-2">OG-level copy-count candidate screen for this {PANEL_LABEL.panelSize} panel. AF and graph in OG Detail are supporting context, not ranking.</p>
        <div className={`text-xs rounded px-3 py-2 border ${modeBanner.cls}`}>{modeBanner.text}</div>

        {isStale && (
          <div className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded px-3 py-2">
            Grouping has changed since this diff was computed. Recomputation may be in progress.
          </div>
        )}

        {entriesState.kind === 'legacy' && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            Showing legacy results stored directly on the Firestore document. Trigger a recompute to
            migrate to the new paginated Storage-backed format.
          </div>
        )}

        <div className="flex items-center gap-2 text-xs flex-wrap">
          <label className="flex items-center gap-1.5 flex-1 min-w-[220px]">
            <span className="text-gray-500 shrink-0">Search:</span>
            <Input
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="OG id, IRGSP transcript, or description…"
              className="flex-1"
            />
            {query && (
              /* raw: inline ✕ clear button — Button primitive is too padded for an inline 1-char glyph next to an Input. */
              <button
                type="button"
                onClick={() => onQueryChange('')}
                className="text-gray-400 hover:text-gray-700"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </label>
          <div className="flex items-center gap-1">
            <span className="text-gray-500">Sort:</span>
            <OrthogroupDiffSortButton current={sortKey} value="p" label="p-value" onClick={onSortChange} />
            <OrthogroupDiffSortButton current={sortKey} value="log2FC" label="|log₂ FC|" onClick={onSortChange} />
          </div>
        </div>

        {(activeCategoryLabel || query) && entries.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap text-[11px]">
            {activeCategoryLabel && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-green-200 bg-green-50 text-green-800">
                Category: <strong>{activeCategoryLabel}</strong>
                {/* raw: inline ✕ — see search-clear above. */}
                <button
                  type="button"
                  onClick={() => onCategoryChange(null)}
                  className="text-green-700 hover:text-green-900 ml-1"
                  aria-label="Clear category filter"
                >
                  ✕
                </button>
              </span>
            )}
            <span className="text-gray-500 tabular-nums">
              {filtered.length.toLocaleString()} of {entries.length.toLocaleString()} OGs
            </span>
          </div>
        )}

        {entriesState.kind === 'loading' ? (
          <p className="text-sm text-gray-400 py-4 text-center">Loading entries…</p>
        ) : entriesState.kind === 'error' ? (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
            Failed to load entries: {entriesState.message}
          </p>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No candidates passed the filter.</p>
        ) : (
          <>
            <Table density="dense" className="text-xs">
              <TableHeader>
                <TableRow className="text-gray-500">
                  <TableHead className="pr-3">Orthogroup</TableHead>
                  {groupLabels.map((lbl) => (
                    <TableHead key={lbl} className="text-right px-2">
                      {lbl} mean
                    </TableHead>
                  ))}
                  <TableHead className="text-right px-2">Δ mean</TableHead>
                  <TableHead className="text-right px-2">Δ presence</TableHead>
                  <TableHead
                    className="text-right px-2"
                    title="Raw two-sided Mann-Whitney U p-value (unadjusted)."
                  >
                    p-value
                  </TableHead>
                  <TableHead className="text-right px-2">log₂ FC</TableHead>
                  <TableHead
                    className="text-right px-2"
                    title="Max |ΔAF| — largest allele frequency difference between groups in this OG's IRGSP gene region"
                  >
                    ΔAF
                  </TableHead>
                  <TableHead
                    className="pl-2"
                    title={`${IRGSP_DISPLAY_NAME} reference transcript and description`}
                  >
                    IRGSP representative*
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((entry) => {
                  const afOg = alleleFreq?.ogs[entry.orthogroup];
                  const maxDaf = afOg?.variants?.[0]?.deltaAf ?? null;
                  return (
                    <OrthogroupDiffRow
                      key={entry.orthogroup}
                      entry={entry}
                      groupLabels={groupLabels}
                      hasAf={!!afOg}
                      maxDeltaAf={maxDaf}
                      onSelectOg={onSelectOg}
                    />
                  );
                })}
              </TableBody>
            </Table>

            <OrthogroupDiffPagination
              page={page}
              pageSize={pageSize}
              totalItems={sorted.length}
              onPageChange={onPageChange}
            />
          </>
        )}

        <p className="text-[10px] text-gray-400">
          * {IRGSP_DISPLAY_NAME} (Nipponbare reference) transcript. Click an orthogroup for details.
        </p>
      </CardContent>
    </Card>
  );
}

function describeMode(mode: SelectionMode, p: number, minDiff: number): { text: string; cls: string } {
  if (mode === 'strict') {
    return {
      text: `Nominal p < ${p}, |Δ mean| ≥ ${minDiff} (raw p-value, not FDR-corrected)`,
      cls: 'bg-green-50 border-green-200 text-green-700',
    };
  }
  if (mode === 'relaxed') {
    return {
      text: `Relaxed: nominal p < ${p}, |Δ mean| ≥ ${minDiff} (too few hits at p < 0.05)`,
      cls: 'bg-amber-50 border-amber-200 text-amber-800',
    };
  }
  return {
    text: `Fallback: no orthogroups reached p < ${p}. Showing top by p-value — interpret with caution.`,
    cls: 'bg-orange-50 border-orange-200 text-orange-800',
  };
}


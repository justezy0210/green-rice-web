import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { OrthogroupDiffPagination } from '@/components/explore/OrthogroupDiffPagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { RegionGene } from '@/lib/region-helpers';

interface Props {
  overlappingGenes: RegionGene[];
  visibleGenes: RegionGene[];
  deferredQuery: string;
  functionQuery: string;
  setFunctionQuery: (v: string) => void;
  partitionLoading: boolean;
  /** Gene currently pinned for highlight in the track viz above. */
  highlightedGeneId: string | null;
  /** Toggle the highlight — same id twice clears it. */
  onToggleHighlight: (id: string) => void;
}

const PAGE_SIZE = 20;

export function OverlappingGenesCard({
  overlappingGenes,
  visibleGenes,
  deferredQuery,
  functionQuery,
  setFunctionQuery,
  partitionLoading,
  highlightedGeneId,
  onToggleHighlight,
}: Props) {
  const [page, setPage] = useState(0);

  // Clamp the requested page into the valid range — if the filter
  // shortens the list to fewer pages than the current value, snap to
  // the last available page instead of rendering an empty slice.
  const totalPages = Math.max(1, Math.ceil(visibleGenes.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);

  const pageRows = useMemo(
    () => visibleGenes.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE),
    [visibleGenes, safePage],
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          Overlapping genes
          <span className="ml-2 text-xs font-normal text-gray-500">
            sorted by start
            {deferredQuery.trim()
              ? ` · ${visibleGenes.length}/${overlappingGenes.length} match`
              : overlappingGenes.length > 0
                ? ` · ${overlappingGenes.length} total`
                : ''}
          </span>
        </CardTitle>
        <CardAction className="flex items-center gap-2">
          <Input
            type="search"
            value={functionQuery}
            onChange={(e) => setFunctionQuery(e.target.value)}
            placeholder="Filter by function (product · Pfam · InterPro · GO)"
            className="w-72"
          />
          {functionQuery && (
            <Button
              variant="outline"
              size="xs"
              onClick={() => setFunctionQuery('')}
            >
              Clear
            </Button>
          )}
        </CardAction>
      </CardHeader>
      <CardContent>
        {overlappingGenes.length === 0 ? (
          <p className="text-sm text-gray-500">
            {partitionLoading
              ? 'Scanning…'
              : 'No annotated genes in this region for this cultivar.'}
          </p>
        ) : visibleGenes.length === 0 ? (
          <p className="text-sm text-gray-500">
            No genes match{' '}
            <code className="text-[11px] bg-gray-100 px-1 py-0.5 rounded">
              {deferredQuery}
            </code>{' '}
            in this region.
          </p>
        ) : (
          <>
            <ul className="divide-y divide-gray-100 text-sm">
              {pageRows.map((g) => {
                const isHighlighted = g.id === highlightedGeneId;
                return (
                  <li
                    key={g.id}
                    onClick={() => onToggleHighlight(g.id)}
                    className={`py-1.5 px-1 rounded flex items-baseline justify-between gap-3 cursor-pointer ${
                      isHighlighted
                        ? 'bg-amber-50 ring-1 ring-amber-300'
                        : 'hover:bg-green-50'
                    }`}
                    title={
                      isHighlighted
                        ? 'Click to clear highlight'
                        : 'Click to highlight this gene in the track above'
                    }
                  >
                    <span className="flex items-baseline gap-2 min-w-0">
                      <Link
                        to={`/genes/${encodeURIComponent(g.id)}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-mono text-gray-900 hover:text-green-700 hover:underline"
                      >
                        {g.id}
                      </Link>
                      {g.ogId ? (
                        <Link
                          to={`/og/${encodeURIComponent(g.ogId)}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[10px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-1 py-[1px] rounded hover:bg-indigo-100"
                        >
                          {g.ogId}
                        </Link>
                      ) : (
                        <span
                          className="text-[10px] font-mono text-gray-300"
                          title="No OrthoFinder assignment"
                        >
                          no OG
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] text-gray-500 whitespace-nowrap font-mono">
                      {g.chr}:{g.start.toLocaleString()}-{g.end.toLocaleString()} ({g.strand})
                      {g.annotation?.product && (
                        <span className="ml-2 text-gray-600">
                          · {g.annotation.product}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-3">
              <OrthogroupDiffPagination
                page={safePage}
                pageSize={PAGE_SIZE}
                totalItems={visibleGenes.length}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

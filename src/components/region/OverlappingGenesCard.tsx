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
import type { RegionGene } from '@/lib/region-helpers';

interface Props {
  overlappingGenes: RegionGene[];
  visibleGenes: RegionGene[];
  deferredQuery: string;
  functionQuery: string;
  setFunctionQuery: (v: string) => void;
  partitionLoading: boolean;
}

const PAGE_SIZE = 20;

export function OverlappingGenesCard({
  overlappingGenes,
  visibleGenes,
  deferredQuery,
  functionQuery,
  setFunctionQuery,
  partitionLoading,
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
          <input
            type="search"
            value={functionQuery}
            onChange={(e) => setFunctionQuery(e.target.value)}
            placeholder="Filter by function (product · Pfam · InterPro · GO)"
            className="w-72 text-[12px] border border-gray-200 rounded px-2 py-1 bg-white focus:border-green-500 focus:ring-1 focus:ring-green-200 outline-none"
          />
          {functionQuery && (
            <button
              onClick={() => setFunctionQuery('')}
              className="text-[11px] text-gray-500 hover:text-gray-800 px-2 py-1 border border-gray-200 rounded"
            >
              Clear
            </button>
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
              {pageRows.map((g) => (
                <li
                  key={g.id}
                  className="py-1.5 px-1 rounded hover:bg-green-50 flex items-baseline justify-between gap-3"
                >
                  <span className="flex items-baseline gap-2 min-w-0">
                    <Link
                      to={`/genes/${encodeURIComponent(g.id)}`}
                      className="font-mono text-gray-900 hover:text-green-700 hover:underline"
                    >
                      {g.id}
                    </Link>
                    {g.ogId ? (
                      <Link
                        to={`/og/${encodeURIComponent(g.ogId)}`}
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
              ))}
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

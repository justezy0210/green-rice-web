import { Link } from 'react-router-dom';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { RegionGene } from '@/lib/region-helpers';

interface Props {
  overlappingGenes: RegionGene[];
  visibleGenes: RegionGene[];
  displayedGenes: RegionGene[];
  deferredQuery: string;
  functionQuery: string;
  setFunctionQuery: (v: string) => void;
  partitionLoading: boolean;
  showAllGenes: boolean;
  toggleShowAll: () => void;
  displayLimit: number;
}

export function OverlappingGenesCard({
  overlappingGenes,
  visibleGenes,
  displayedGenes,
  deferredQuery,
  functionQuery,
  setFunctionQuery,
  partitionLoading,
  showAllGenes,
  toggleShowAll,
  displayLimit,
}: Props) {
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
              {displayedGenes.map((g) => (
                <li key={g.id}>
                  <Link
                    to={`/genes/${encodeURIComponent(g.id)}`}
                    className="block py-1.5 px-1 rounded hover:bg-green-50 flex items-baseline justify-between gap-3"
                  >
                    <span className="font-mono text-gray-900">{g.id}</span>
                    <span className="text-[11px] text-gray-500 whitespace-nowrap font-mono">
                      {g.chr}:{g.start.toLocaleString()}-{g.end.toLocaleString()} ({g.strand})
                      {g.annotation?.product && (
                        <span className="ml-2 text-gray-600">
                          · {g.annotation.product}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {visibleGenes.length > displayLimit && (
              <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-gray-500">
                {showAllGenes ? (
                  <span>
                    Showing all{' '}
                    <strong className="text-gray-800 tabular-nums">
                      {visibleGenes.length}
                    </strong>{' '}
                    rows (may be slow).
                  </span>
                ) : (
                  <span>
                    Showing top{' '}
                    <strong className="text-gray-800 tabular-nums">
                      {displayLimit}
                    </strong>{' '}
                    of{' '}
                    <strong className="text-gray-800 tabular-nums">
                      {visibleGenes.length}
                    </strong>
                    . Narrow with the filter above, or
                  </span>
                )}
                <button
                  onClick={toggleShowAll}
                  className="text-green-700 hover:underline"
                >
                  {showAllGenes
                    ? `show top ${displayLimit}`
                    : `show all ${visibleGenes.length}`}
                </button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

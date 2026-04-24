import { Link } from 'react-router-dom';
import { TraitHitBadges } from '@/components/gene/TraitHitBadges';
import { SvOverlapBadge } from '@/components/gene/SvOverlapBadge';
import type { TraitHit } from '@/hooks/useTraitHits';
import type { GeneSvEntry } from '@/types/gene-sv-index';

interface Item {
  geneId: string;
  cultivar: string;
  og?: string;
  via: string;
  product?: string;
}

interface Props {
  loading: boolean;
  items: Item[];
  total: number;
  hasMore: boolean;
  onShowMore: () => void;
  onShowAll: () => void;
  hitsForOg: (og: string | undefined | null) => TraitHit[];
  svForGene: (geneId: string | null | undefined) => GeneSvEntry | null;
  highlightIdx: number;
  setHighlightIdx: (i: number) => void;
  emptyHint: string;
  truncated?: boolean;
}

export function GeneSearchResultList({
  loading,
  items,
  total,
  hasMore,
  onShowMore,
  onShowAll,
  hitsForOg,
  svForGene,
  highlightIdx,
  setHighlightIdx,
  emptyHint,
  truncated,
}: Props) {
  if (loading) {
    return <p className="text-sm text-gray-400">Loading…</p>;
  }
  if (total === 0) {
    return <p className="text-sm text-gray-500">{emptyHint}</p>;
  }
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-[11px] text-gray-500">
        <span>
          showing {items.length} of {total.toLocaleString()} match
          {total === 1 ? '' : 'es'}
        </span>
        {truncated && (
          <span className="text-amber-700">
            hit 1000-result safety cap — narrow your query
          </span>
        )}
      </div>
      <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg bg-white">
        {items.map((it, i) => (
          <li
            key={`${it.geneId}-${i}`}
            className={`px-4 py-2 text-sm ${i === highlightIdx ? 'bg-green-100' : 'hover:bg-green-50'}`}
            onMouseEnter={() => setHighlightIdx(i)}
          >
            <div className="flex items-baseline justify-between gap-3">
              <Link
                to={`/genes/${encodeURIComponent(it.geneId)}`}
                className="font-mono text-gray-900 hover:underline"
              >
                {it.geneId}
              </Link>
              <span className="text-[11px] text-gray-500 whitespace-nowrap flex items-center gap-2">
                {it.cultivar}
                {it.og && (
                  <>
                    <span>·</span>
                    <Link
                      to={`/og/${it.og}`}
                      className="font-mono text-gray-600 hover:underline"
                    >
                      {it.og}
                    </Link>
                    <TraitHitBadges hits={hitsForOg(it.og)} ogId={it.og} />
                  </>
                )}
                <SvOverlapBadge entry={svForGene(it.geneId)} />
              </span>
            </div>
            {it.product && (
              <div className="text-[11px] text-gray-600 mt-0.5 truncate">
                {it.product}
              </div>
            )}
          </li>
        ))}
      </ul>
      {hasMore && (
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onShowMore}
            className="text-[11px] px-3 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
          >
            Show 50 more
          </button>
          <button
            type="button"
            onClick={onShowAll}
            className="text-[11px] px-3 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
          >
            Show all {total.toLocaleString()}
          </button>
        </div>
      )}
    </div>
  );
}

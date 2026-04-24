import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ScopeStrip } from '@/components/common/ScopeStrip';
import { TraitHitBadges } from '@/components/gene/TraitHitBadges';
import { useGeneIndexManifest, useGeneSearch } from '@/hooks/useGeneIndex';
import { useFunctionalSearch } from '@/hooks/useFunctionalSearch';
import { useTraitHits, type TraitHit } from '@/hooks/useTraitHits';

export function GeneSearchPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const qParam = params.get('q') ?? '';
  const [input, setInput] = useState(qParam);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [displayLimit, setDisplayLimit] = useState(50);
  const { manifest, loading: manifestLoading } = useGeneIndexManifest();
  const traitHits = useTraitHits();

  const idSearch = useGeneSearch(input, 1000);
  const funcSearch = useFunctionalSearch(input, 1000);

  const activeSource =
    funcSearch.mode === 'gene-id' ||
    funcSearch.mode === 'idle' ||
    idSearch.loading ||
    idSearch.results.length > 0
      ? 'id'
      : 'functional';
  const activeResults =
    activeSource === 'id'
      ? idSearch.results.map((r) => ({
          geneId: r.geneId,
          cultivar: r.entry.cultivar,
          og: r.entry.og,
          via: 'gene-id' as const,
          product: undefined as string | undefined,
        }))
      : funcSearch.hits.map((h) => ({
          geneId: h.row.g,
          cultivar: h.row.c,
          og: h.row.og,
          via: h.via,
          product: h.row.p,
        }));

  useEffect(() => {
    setParams(
      (prev) => {
        const t = input.trim();
        if (t) prev.set('q', t);
        else prev.delete('q');
        return prev;
      },
      { replace: true },
    );
  }, [input, setParams]);

  const visible = activeResults.slice(0, displayLimit);
  const hasMore = activeResults.length > displayLimit;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (visible.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx((i) => (i + 1) % visible.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((i) => (i <= 0 ? visible.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const idx = highlightIdx >= 0 ? highlightIdx : 0;
      const target = visible[idx];
      if (target) navigate(`/genes/${encodeURIComponent(target.geneId)}`);
    }
  };

  const hasQuery = input.trim().length >= 1;
  const mode = funcSearch.mode;

  return (
    <div className="space-y-4 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Genes</h1>
        <p className="text-sm text-gray-500 mt-1">
          Lookup by gene ID, Pfam, InterPro, GO term, or functional product.
          Start typing — matches appear live.
        </p>
      </div>

      <ScopeStrip>
        Functional annotation (product, Pfam, InterPro, GO) covers{' '}
        {funcSearch.annotatedCultivars.length || 11} of 16 panel cultivars.
        Gene-ID lookup works for all. EggNOG / COG not indexed.
      </ScopeStrip>

      <div>
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setHighlightIdx(-1);
            setDisplayLimit(50);
          }}
          onKeyDown={onKeyDown}
          placeholder='Gene ID, "PF00069", "GO:0090630", or keyword…'
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
          autoFocus
        />
      </div>

      {/* Index state */}
      {manifestLoading ? (
        <p className="text-sm text-gray-400">Loading index…</p>
      ) : !manifest ? (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          Gene index has not been built yet. Run{' '}
          <code>scripts/build-gene-og-index.py</code>.
        </p>
      ) : (
        <div className="text-[11px] text-gray-500 tabular-nums flex flex-wrap gap-x-4 gap-y-0.5">
          <span>
            gene-id index: built {manifest.builtAt} ·{' '}
            {manifest.totalGenes.toLocaleString()} entries
          </span>
          {funcSearch.indexAvailable && (
            <span>
              functional index: {funcSearch.annotatedCultivars.length} cultivars
            </span>
          )}
          {hasQuery && (
            <span className="ml-auto">
              mode:{' '}
              <code className="bg-gray-100 px-1 rounded">
                {activeSource === 'id' ? 'gene-id' : mode}
              </code>
            </span>
          )}
        </div>
      )}

      {/* Results */}
      {hasQuery && activeSource === 'id' && (
        <ResultList
          loading={idSearch.loading}
          items={visible}
          total={activeResults.length}
          hasMore={hasMore}
          onShowMore={() => setDisplayLimit((n) => n + 50)}
          onShowAll={() => setDisplayLimit(activeResults.length)}
          hitsForOg={traitHits.hitsForOg}
          highlightIdx={highlightIdx}
          setHighlightIdx={setHighlightIdx}
          emptyHint="No gene IDs matched. Try a functional keyword, or check the cultivar prefix."
        />
      )}
      {hasQuery && activeSource === 'functional' && (
        <>
          {!funcSearch.indexAvailable && funcSearch.loading && (
            <p className="text-sm text-gray-400">
              Loading functional index (~20 MB gzipped, one-time)…
            </p>
          )}
          {!funcSearch.indexAvailable && !funcSearch.loading && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              Functional index unavailable. Run{' '}
              <code>scripts/build-functional-search-index.py</code>.
            </p>
          )}
          {funcSearch.indexAvailable && (
            <ResultList
              loading={false}
              items={visible}
              total={activeResults.length}
              hasMore={hasMore}
              onShowMore={() => setDisplayLimit((n) => n + 50)}
              onShowAll={() => setDisplayLimit(activeResults.length)}
              hitsForOg={traitHits.hitsForOg}
              highlightIdx={highlightIdx}
              setHighlightIdx={setHighlightIdx}
              emptyHint={
                mode === 'product'
                  ? '"Hypothetical protein" is excluded from product search. Try a more specific term.'
                  : 'No matches in the functional index.'
              }
              truncated={funcSearch.truncated}
            />
          )}
        </>
      )}
    </div>
  );
}

function ResultList({
  loading,
  items,
  total,
  hasMore,
  onShowMore,
  onShowAll,
  hitsForOg,
  highlightIdx,
  setHighlightIdx,
  emptyHint,
  truncated,
}: {
  loading: boolean;
  items: {
    geneId: string;
    cultivar: string;
    og?: string;
    via: string;
    product?: string;
  }[];
  total: number;
  hasMore: boolean;
  onShowMore: () => void;
  onShowAll: () => void;
  hitsForOg: (og: string | undefined | null) => TraitHit[];
  highlightIdx: number;
  setHighlightIdx: (i: number) => void;
  emptyHint: string;
  truncated?: boolean;
}) {
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

import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ScopeStrip } from '@/components/common/ScopeStrip';
import { useGeneIndexManifest, useGeneSearch } from '@/hooks/useGeneIndex';

export function GeneSearchPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const qParam = params.get('q') ?? '';
  const [input, setInput] = useState(qParam);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const { manifest, loading: manifestLoading } = useGeneIndexManifest();
  const search = useGeneSearch(input, 50);

  // Keep URL in sync (share/back) without forcing submit
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

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (search.results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx((i) => (i + 1) % search.results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((i) => (i <= 0 ? search.results.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const idx = highlightIdx >= 0 ? highlightIdx : 0;
      const target = search.results[idx];
      if (target) navigate(`/genes/${encodeURIComponent(target.geneId)}`);
    }
  };

  const hasQuery = input.trim().length >= 1;

  return (
    <div className="space-y-4 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Genes</h1>
        <p className="text-sm text-gray-500 mt-1">
          Lookup across all panel cultivars by gene ID. Start typing — matches
          appear live.
        </p>
      </div>

      <ScopeStrip>
        Search matches gene IDs only (Stage 2B MVP). Keyword and
        functional-annotation search require additional data ingestion and
        are deferred.
      </ScopeStrip>

      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setHighlightIdx(-1);
          }}
          onKeyDown={onKeyDown}
          placeholder="Gene ID (type 1+ character)…"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
          autoFocus
        />
      </div>

      {manifestLoading ? (
        <p className="text-sm text-gray-400">Loading index…</p>
      ) : !manifest ? (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          Gene index has not been built yet. Run{' '}
          <code>scripts/build-gene-og-index.py</code> to populate the index.
        </p>
      ) : (
        <div className="text-[11px] text-gray-500 tabular-nums">
          Index built {manifest.builtAt} ·{' '}
          {manifest.totalGenes.toLocaleString()} gene rows ·{' '}
          {Object.keys(manifest.partitions).length} partitions
        </div>
      )}

      {hasQuery && (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between text-[11px] text-gray-500 tabular-nums">
            <span>
              {search.prefixes.length > 0 ? (
                <>
                  partitions <code>{search.prefixes.join(', ')}</code> ·{' '}
                  {search.totalSearched.toLocaleString()} genes searched
                </>
              ) : (
                'no matching partition for this query'
              )}
            </span>
            <span>{search.results.length} matches (capped at 50)</span>
          </div>
          {search.loading ? (
            <p className="text-sm text-gray-400">Loading partition…</p>
          ) : search.results.length === 0 ? (
            <p className="text-sm text-gray-500">No gene IDs matched.</p>
          ) : (
            <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg bg-white">
              {search.results.map(({ geneId, entry }, i) => (
                <li key={geneId}>
                  <Link
                    to={`/genes/${encodeURIComponent(geneId)}`}
                    className={`block px-4 py-2 text-sm ${i === highlightIdx ? 'bg-green-100' : 'hover:bg-green-50'}`}
                    onMouseEnter={() => setHighlightIdx(i)}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-mono text-gray-900">{geneId}</span>
                      <span className="text-[11px] text-gray-500">
                        {entry.cultivar} ·{' '}
                        <span className="font-mono text-gray-600">{entry.og}</span>
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCultivars } from '@/hooks/useCultivars';
import { useGenomeSummary } from '@/hooks/useGenomeSummary';
import { GenomeDownloadSection } from '@/components/cultivar/GenomeDownloadSection';

export function DownloadPage() {
  const [params, setParams] = useSearchParams();
  const { cultivars, loading, error } = useCultivars();

  const [query, setQuery] = useState('');

  const sorted = useMemo(
    () => cultivars.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [cultivars],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        (c.crossInformation ?? '').toLowerCase().includes(q),
    );
  }, [sorted, query]);

  const selectedId = params.get('cultivar') ?? sorted[0]?.id ?? null;
  const selected = sorted.find((c) => c.id === selectedId) ?? sorted[0] ?? null;
  const effectiveId = selected?.id ?? null;

  const { summary } = useGenomeSummary(effectiveId ?? undefined);

  const selectCultivar = (id: string) => {
    setParams(
      (prev) => {
        prev.set('cultivar', id);
        return prev;
      },
      { replace: true },
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Downloads</h1>
        <p className="text-sm text-gray-500 mt-1">
          Select a cultivar to download its genome assembly and annotation files.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4 items-start">
        <aside className="border border-gray-200 rounded-lg bg-white overflow-hidden flex flex-col h-[calc(100vh-10rem)] lg:sticky lg:top-20">
          <div className="px-3 py-2 border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center justify-between">
            <span>Cultivars</span>
            <span className="text-gray-400 normal-case tabular-nums">
              {query ? `${filtered.length}/${sorted.length}` : sorted.length}
            </span>
          </div>
          <div className="px-2 py-2 border-b border-gray-100">
            <div className="relative">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search cultivar…"
                className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-xs px-1"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          {loading ? (
            <p className="px-3 py-4 text-xs text-gray-400">Loading…</p>
          ) : error ? (
            <p className="px-3 py-4 text-xs text-red-500">{error}</p>
          ) : sorted.length === 0 ? (
            <p className="px-3 py-4 text-xs text-gray-400">No cultivars available.</p>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-4 text-xs text-gray-400">No matches for &ldquo;{query}&rdquo;</p>
          ) : (
            <ul className="flex-1 overflow-y-auto min-h-0">
              {filtered.map((c) => {
                const active = c.id === effectiveId;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => selectCultivar(c.id)}
                      aria-current={active ? 'true' : undefined}
                      className={`w-full text-left text-sm px-3 py-2 border-l-2 transition-colors ${
                        active
                          ? 'bg-green-50 border-green-500 text-green-900 font-medium'
                          : 'border-transparent text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {c.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <section>
          {selected ? (
            <div className="space-y-3">
              <div className="px-1">
                <h2 className="text-lg font-semibold text-gray-900">{selected.name}</h2>
                {selected.crossInformation && (
                  <p className="text-xs text-gray-500">{selected.crossInformation}</p>
                )}
              </div>
              <GenomeDownloadSection genomeSummary={summary} />
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg p-8 text-center text-sm text-gray-500">
              {loading ? 'Loading cultivars…' : 'Select a cultivar from the left.'}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

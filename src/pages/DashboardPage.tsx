import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePhenotypeData } from '@/hooks/usePhenotypeData';
import { PhenotypeDistributionChart } from '@/components/dashboard/PhenotypeDistributionChart';
import { TraitQualityOverview } from '@/components/dashboard/TraitQualityOverview';
import {
  PANEL_LABEL,
  REFERENCE_SHORT_NAME,
  TOTAL_CULTIVARS,
  TRAIT_COUNT,
} from '@/config/panel';

export function DashboardPage() {
  const { records, loading, error } = usePhenotypeData();
  const [search, setSearch] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const suggestions = dropdownOpen
    ? records.filter((r) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return r.cultivar.toLowerCase().includes(q) || (r.crossInformation ?? '').toLowerCase().includes(q);
      })
    : [];


  function selectCultivar(name: string) {
    setSearch('');
    setDropdownOpen(false);
    setHighlightIdx(-1);
    (document.activeElement as HTMLElement)?.blur();
    navigate(`/cultivar/${encodeURIComponent(name)}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = highlightIdx >= 0 ? suggestions[highlightIdx] : suggestions[0];
      if (target) selectCultivar(target.cultivar);
    } else if (e.key === 'Escape') {
      setDropdownOpen(false);
      setHighlightIdx(-1);
    }
  }

  if (loading === 'loading') {
    return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-64 text-red-500">Error loading data: {error}</div>;
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Hero — identity + panel summary + primary CTA */}
      <section className="rounded-lg border border-green-100 bg-gradient-to-br from-green-50 to-white px-6 py-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <h1 className="text-2xl font-bold text-gray-900">
              Phenotype-driven candidate discovery for Korean rice
            </h1>
            <p className="text-sm text-gray-600 leading-relaxed">
              This resource prioritizes candidate genes and genomic elements that distinguish trait
              groups across {TOTAL_CULTIVARS} Korean temperate japonica cultivars using orthogroup,
              variant, and graph-based evidence — as a starting point for downstream biological
              validation.
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 pt-1 text-[11px] text-gray-500">
              <span>{records.length} cultivars loaded</span>
              <span>{TRAIT_COUNT} traits</span>
              <span>Cactus pangenome ({PANEL_LABEL.coverageOf} assembled)</span>
              <span>OrthoFinder orthogroups</span>
              <span>{REFERENCE_SHORT_NAME}</span>
            </div>
            <div className="pt-2 flex items-center gap-3">
              <Link
                to="/explore"
                className="inline-flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md px-4 py-2 transition-colors"
              >
                Start exploring candidates <span aria-hidden>→</span>
              </Link>
              <span className="text-[11px] text-gray-500">
                Pick a trait · see candidate orthogroups per proposed phenotype group
              </span>
            </div>
          </div>

          {/* Secondary utility — cultivar lookup */}
          <aside className="w-full md:max-w-xs space-y-1.5">
            <label className="text-[11px] text-gray-500 uppercase tracking-wide">
              Cultivar lookup
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search a cultivar…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setDropdownOpen(true);
                  setHighlightIdx(-1);
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => { setDropdownOpen(true); setHighlightIdx(-1); }}
                onBlur={() => { setTimeout(() => setDropdownOpen(false), 150); }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
              />
              {suggestions.length > 0 && (
                <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {suggestions.map((r, i) => (
                    <li key={r.cultivar}>
                      <button
                        className={`w-full text-left px-3 py-1.5 text-sm cursor-pointer flex items-center justify-between ${i === highlightIdx ? 'bg-green-100 text-green-800' : 'hover:bg-green-50'}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectCultivar(r.cultivar)}
                      >
                        <span>{r.cultivar}</span>
                        {r.crossInformation && (
                          <span className="text-[10px] text-gray-400 ml-2 truncate max-w-44">{r.crossInformation}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="text-[10px] text-gray-400">
              Lookup is a supporting utility — the discovery workflow starts at{' '}
              <Link to="/explore" className="text-green-700 hover:underline">Explore</Link>.
            </p>
          </aside>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-6 gap-6 items-stretch">
        <div className="lg:col-span-4">
          <PhenotypeDistributionChart records={records} />
        </div>
        <div className="lg:col-span-2">
          <TraitQualityOverview records={records} />
        </div>
      </div>
    </div>
  );
}

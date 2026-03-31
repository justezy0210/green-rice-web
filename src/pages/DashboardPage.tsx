import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePhenotypeData } from '@/hooks/usePhenotypeData';
import { PhenotypeDistributionChart } from '@/components/dashboard/PhenotypeDistributionChart';
import { MissingDataHeatmap } from '@/components/dashboard/MissingDataHeatmap';

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
    <div className="space-y-6">
      <div className="flex flex-col items-center py-8 gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Korean Rice Cultivar DB</h1>
        <p className="text-sm text-gray-500">{records.length} cultivars registered</p>
        <div className="relative w-full max-w-md mt-3">
          <input
            type="text"
            placeholder="Search cultivar name…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setDropdownOpen(true);
              setHighlightIdx(-1);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => { setDropdownOpen(true); setHighlightIdx(-1); }}
            onBlur={() => { setTimeout(() => setDropdownOpen(false), 150); }}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm shadow-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
          />
          {suggestions.length > 0 && (
            <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {suggestions.map((r, i) => (
                <li key={r.cultivar}>
                  <button
                    className={`w-full text-left px-4 py-2 text-sm cursor-pointer flex items-center justify-between ${i === highlightIdx ? 'bg-green-100 text-green-800' : 'hover:bg-green-50'}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectCultivar(r.cultivar)}
                  >
                    <span>{r.cultivar}</span>
                    {r.crossInformation && (
                      <span className="text-xs text-gray-400 ml-2 truncate max-w-48">{r.crossInformation}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-6 gap-6 items-stretch">
        <div className="col-span-4">
          <PhenotypeDistributionChart records={records} />
        </div>
        <div className="col-span-2">
          <MissingDataHeatmap records={records} />
        </div>
      </div>
    </div>
  );
}

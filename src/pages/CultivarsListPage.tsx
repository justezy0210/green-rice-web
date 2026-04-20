import { Link } from 'react-router-dom';
import { useCultivars } from '@/hooks/useCultivars';
import { usePhenotypeData } from '@/hooks/usePhenotypeData';
import { ScopeStrip } from '@/components/common/ScopeStrip';

export function CultivarsListPage() {
  const { cultivars, loading, error } = useCultivars();
  const { records } = usePhenotypeData();

  const crossByCultivar = new Map<string, string>();
  for (const r of records) {
    if (r.crossInformation) crossByCultivar.set(r.cultivar, r.crossInformation);
  }

  if (loading) {
    return <p className="text-sm text-gray-400 py-10 text-center">Loading…</p>;
  }
  if (error) {
    return <p className="text-sm text-red-500 py-10 text-center">Error: {error}</p>;
  }

  return (
    <div className="space-y-4 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cultivars</h1>
        <p className="text-sm text-gray-500 mt-1">
          {cultivars.length} Korean temperate japonica cultivars in the panel.
          Each page lists the assembly summary, annotation stats, and downloads.
        </p>
      </div>

      <ScopeStrip>
        Panel composition is fixed at 16 cultivars — findings do not generalize
        to Korean japonica beyond the panel.
      </ScopeStrip>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {cultivars.map((c) => {
          const cross = crossByCultivar.get(c.name);
          return (
            <Link
              key={c.id}
              to={`/cultivar/${encodeURIComponent(c.name)}`}
              className="block rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 bg-white px-4 py-3 transition-colors"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-900">{c.name}</h3>
                <span className="text-[10px] font-mono text-gray-400">{c.id}</span>
              </div>
              {cross && (
                <p className="text-[11px] text-gray-500 mt-0.5 truncate">{cross}</p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

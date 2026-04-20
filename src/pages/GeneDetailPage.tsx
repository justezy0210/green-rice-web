import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScopeStrip } from '@/components/common/ScopeStrip';
import { useGeneLookup } from '@/hooks/useGeneIndex';
import { useOgGeneCoords } from '@/hooks/useOgGeneCoords';
import { useOgDrilldown } from '@/hooks/useOgDrilldown';
import { useCultivars } from '@/hooks/useCultivars';

export function GeneDetailPage() {
  const { geneId: rawGeneId } = useParams<{ geneId: string }>();
  const geneId = rawGeneId ? decodeURIComponent(rawGeneId) : null;
  const lookup = useGeneLookup(geneId);
  const { data: ogCoords } = useOgGeneCoords(lookup.entry?.og ?? null);
  const { members } = useOgDrilldown(lookup.entry?.og ?? null, lookup.version);
  const { cultivars } = useCultivars();

  const cultivarNameMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of cultivars) m[c.id] = c.name;
    return m;
  }, [cultivars]);

  const coord = useMemo(() => {
    if (!ogCoords || !lookup.entry || !geneId) return null;
    const list = ogCoords[lookup.entry.cultivar] ?? [];
    return list.find((g) => g.id === geneId) ?? null;
  }, [ogCoords, lookup.entry, geneId]);

  const copyMatrix = useMemo(() => {
    if (!members || cultivars.length === 0) return [];
    return cultivars
      .map((c) => ({
        id: c.id,
        name: c.name,
        count: members[c.id]?.length ?? 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [members, cultivars]);

  if (!geneId) {
    return <div className="py-20 text-center text-gray-500">No gene specified.</div>;
  }

  if (lookup.loading) {
    return <p className="text-sm text-gray-400 py-10 text-center">Looking up {geneId}…</p>;
  }

  if (lookup.notFound) {
    return (
      <div className="space-y-4 py-8 text-center">
        <h1 className="text-xl font-semibold text-gray-900">Gene not in index</h1>
        <p className="text-sm text-gray-500">
          <span className="font-mono">{geneId}</span> is not present in the
          current gene → orthogroup index. The gene may not belong to any
          OrthoFinder orthogroup, or the index may be out of date.
        </p>
        <Link to="/genes" className="text-sm text-green-700 hover:underline">
          ← Back to gene search
        </Link>
      </div>
    );
  }

  if (!lookup.entry) {
    return (
      <div className="space-y-4 py-8 text-center">
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 inline-block">
          Gene index unavailable. Run{' '}
          <code>scripts/build-gene-og-index.py</code> to populate.
        </p>
      </div>
    );
  }

  const { og, cultivar } = lookup.entry;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/genes" className="hover:text-green-700 hover:underline">
          ← Genes
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{geneId}</span>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            <span className="font-mono">{geneId}</span>
            <span className="ml-2 text-sm font-normal text-gray-500">
              {cultivarNameMap[cultivar] ?? cultivar}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-700 space-y-2">
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <div>
              <span className="text-[10px] uppercase tracking-wide text-gray-500 block">
                Orthogroup
              </span>
              <Link
                to={`/og/${og}`}
                className="font-mono text-green-700 hover:underline"
              >
                {og}
              </Link>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wide text-gray-500 block">
                Cultivar
              </span>
              <span className="font-medium">{cultivarNameMap[cultivar] ?? cultivar}</span>
            </div>
            {coord && (
              <div>
                <span className="text-[10px] uppercase tracking-wide text-gray-500 block">
                  Position
                </span>
                <span className="font-mono">
                  {coord.chr}:{coord.start.toLocaleString()}-
                  {coord.end.toLocaleString()} ({coord.strand})
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <ScopeStrip>
        Gene detail is resolved from the orthogroup membership index. Functional
        annotation (Pfam / InterPro / GO), transcript structure, and
        cross-cultivar synteny are not yet surfaced at this level — open the
        orthogroup for OG-wide context.
      </ScopeStrip>

      {copyMatrix.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Orthogroup copy count across panel
              <span className="ml-2 text-xs font-normal text-gray-500">
                {og}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {copyMatrix.map((c) => {
                const isThis = c.id === cultivar;
                const tone =
                  c.count === 0
                    ? 'border-gray-200 bg-gray-50 text-gray-500'
                    : c.count === 1
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-violet-200 bg-violet-50 text-violet-700';
                return (
                  <span
                    key={c.id}
                    className={`text-[11px] inline-flex items-center gap-1 px-2 py-0.5 rounded border ${tone} ${isThis ? 'ring-1 ring-green-400' : ''}`}
                    title={isThis ? 'this gene\'s cultivar' : undefined}
                  >
                    <span className="font-mono text-[10px]">{c.name}</span>
                    <span className="opacity-60">·</span>
                    <span className="tabular-nums">{c.count}</span>
                  </span>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

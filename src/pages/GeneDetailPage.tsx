import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScopeStrip } from '@/components/common/ScopeStrip';
import { ObservedInAnalysesPanel } from '@/components/entity/ObservedInAnalysesPanel';
import { GeneModelSvg } from '@/components/gene/GeneModelSvg';
import {
  GeneAnnotationCard,
  LegendSwatch,
} from '@/components/gene/GeneAnnotationCard';
import { useGeneLookup } from '@/hooks/useGeneIndex';
import { useGeneModel } from '@/hooks/useGeneModel';
import { useOgGeneCoords } from '@/hooks/useOgGeneCoords';
import { useOgDrilldown } from '@/hooks/useOgDrilldown';
import { useCultivars } from '@/hooks/useCultivars';

export function GeneDetailPage() {
  const { geneId: rawGeneId } = useParams<{ geneId: string }>();
  const geneId = rawGeneId ? decodeURIComponent(rawGeneId) : null;
  const lookup = useGeneLookup(geneId);
  const model = useGeneModel(geneId);
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
        geneIds: members[c.id] ?? [],
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
                <Link
                  to={`/region/${encodeURIComponent(cultivar)}/${encodeURIComponent(coord.chr)}/${Math.max(0, coord.start - 5000)}-${coord.end + 5000}`}
                  className="font-mono text-green-700 hover:underline"
                  title="View this gene's region ± 5 kb"
                >
                  {coord.chr}:{coord.start.toLocaleString()}-
                  {coord.end.toLocaleString()} ({coord.strand})
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {model.entry && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Gene model
              <span className="ml-2 text-xs font-normal text-gray-500">
                representative transcript · {model.entry.transcript.id}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <GeneModelSvg gene={model.entry} />
            <div className="flex flex-wrap gap-3 text-[11px] text-gray-500">
              <LegendSwatch color="rgba(22, 163, 74, 0.9)" label="CDS" />
              <LegendSwatch color="rgba(156, 163, 175, 0.55)" label="UTR" />
              <LegendSwatch color="#d1d5db" label="intron" thin />
              <span className="ml-auto">
                Only the longest-CDS representative transcript is shown.
                Alternative isoforms deferred.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {model.entry?.annotation && (
        <GeneAnnotationCard annotation={model.entry.annotation} />
      )}

      {model.loading && !model.entry && (
        <p className="text-[11px] text-gray-400">
          Loading gene model partition (~20–40 MB, cached after first load)…
        </p>
      )}

      {!model.loading && model.notFound && (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          This gene is in the orthogroup index but has no gene-model entry.
          Possible causes: non-funannotate cultivar, ID mismatch, or missing
          mRNA feature in the source GFF3.
        </p>
      )}

      <ScopeStrip>
        Gene detail resolves from the orthogroup membership index + funannotate
        gene model. Variants, transcript isoforms, and cross-cultivar synteny
        are deferred. Open the orthogroup for OG-wide context, or the region
        page for the locus-level graph view.
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
                const baseCls = `text-[11px] inline-flex items-center gap-1 px-2 py-0.5 rounded border ${tone} ${isThis ? 'ring-1 ring-green-400' : ''}`;
                const body = (
                  <>
                    <span className="font-mono text-[10px]">{c.name}</span>
                    <span className="opacity-60">·</span>
                    <span className="tabular-nums">{c.count}</span>
                  </>
                );
                if (c.count === 0) {
                  return (
                    <span
                      key={c.id}
                      className={baseCls}
                      title="no annotated OG member in this cultivar"
                    >
                      {body}
                    </span>
                  );
                }
                const target = c.geneIds[0];
                const tip =
                  c.count > 1
                    ? `${c.count} copies in ${c.name} — opens first: ${target}`
                    : `opens ${target}`;
                return (
                  <Link
                    key={c.id}
                    to={`/genes/${encodeURIComponent(target)}`}
                    className={`${baseCls} hover:ring-1 hover:ring-green-400 transition`}
                    title={isThis ? "this gene's cultivar" : tip}
                  >
                    {body}
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <ObservedInAnalysesPanel entityType="gene" entityId={geneId} />
    </div>
  );
}


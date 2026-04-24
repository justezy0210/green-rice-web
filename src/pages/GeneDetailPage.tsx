import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScopeStrip } from '@/components/common/ScopeStrip';
import { ConservationSummary } from '@/components/entity/ConservationSummary';
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
import { useOgConservation } from '@/hooks/useOgConservation';
import { useTraitHits } from '@/hooks/useTraitHits';
import { useSvEventsForRegion } from '@/hooks/useSvEventsForRegion';
import { useSvCultivarCoords } from '@/hooks/useSvCultivarCoords';
import { SV_RELEASE_ID } from '@/lib/releases';
import type { GeneSvOverlay } from '@/components/gene/GeneModelSvg';

export function GeneDetailPage() {
  const { geneId: rawGeneId } = useParams<{ geneId: string }>();
  const geneId = rawGeneId ? decodeURIComponent(rawGeneId) : null;
  const lookup = useGeneLookup(geneId);
  const model = useGeneModel(geneId);
  const { data: ogCoords } = useOgGeneCoords(lookup.entry?.og ?? null);
  const { members } = useOgDrilldown(lookup.entry?.og ?? null, lookup.version);
  const { cultivars } = useCultivars();
  const {
    bundle: conservationBundle,
    loading: conservationLoading,
    error: conservationError,
  } = useOgConservation(lookup.version ?? null);
  const { hitsForOg } = useTraitHits();

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

  // Per-cultivar sample-frame SV overlay; side-table required.
  const cultivarId = model.entry?.cultivar ?? null;
  const geneChr = model.entry?.chr ?? null;
  const { events: chrSvEvents } = useSvEventsForRegion({
    svReleaseId: SV_RELEASE_ID, chr: geneChr, start: null, end: null,
    cultivar: cultivarId, scope: 'cultivar',
  });
  const { byEvent: cultivarCoords, available: coordsAvailable, error: coordsError } =
    useSvCultivarCoords({ svReleaseId: SV_RELEASE_ID, cultivar: cultivarId, chr: geneChr });
  const svOverlay = useMemo<GeneSvOverlay[]>(() => {
    if (!model.entry || !coordsAvailable) return [];
    const gene = model.entry;
    const out: GeneSvOverlay[] = [];
    for (const ev of chrSvEvents) {
      const c = cultivarCoords.get(ev.eventId);
      if (!c) continue;
      // Span intersection: a DEL/COMPLEX upstream of gene still counts if it extends in.
      if (c.pos + Math.max(1, c.refLen) < gene.start || c.pos > gene.end) continue;
      out.push({ eventId: ev.eventId, pos: c.pos, refLen: c.refLen, altLen: ev.altLen, svType: ev.svType });
    }
    return out;
  }, [model.entry, chrSvEvents, cultivarCoords, coordsAvailable]);


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
            <GeneModelSvg gene={model.entry} svEvents={svOverlay} />
            <div className="flex flex-wrap gap-3 text-[11px] text-gray-500">
              <LegendSwatch color="rgba(22, 163, 74, 0.9)" label="CDS" />
              <LegendSwatch color="rgba(156, 163, 175, 0.55)" label="UTR" />
              <LegendSwatch color="#d1d5db" label="intron" thin />
              {coordsAvailable && <>
                <LegendSwatch color="#0f766e" label="INS (sample carries extra)" />
                <LegendSwatch color="#b91c1c" label="DEL (breakpoint)" />
                <LegendSwatch color="#7c3aed" label="COMPLEX (rearranged)" />
              </>}
              <span className="ml-auto">Only the longest-CDS representative transcript. Isoforms deferred.</span>
            </div>
            {coordsError && (
              <p className="text-[11px] text-red-600 leading-snug">Could not load per-cultivar SV coordinates: {coordsError.message}</p>
            )}
            {!coordsError && !coordsAvailable && chrSvEvents.length > 0 && (
              <p className="text-[11px] text-gray-500 leading-snug">
                Per-cultivar SV coordinates not generated for this release yet —
                overlay hidden to avoid misplacing events on the wrong exon.
              </p>
            )}
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

      {og && (
        <ConservationSummary
          ogId={og}
          bundle={conservationBundle}
          loading={conservationLoading}
          error={conservationError}
          cultivars={cultivars.map((c) => ({ id: c.id, name: c.name }))}
          highlightCultivarId={cultivar ?? undefined}
          linkForCultivar={(cid) => {
            const gid = members?.[cid]?.[0];
            return gid ? `/genes/${encodeURIComponent(gid)}` : null;
          }}
          traitHits={[...hitsForOg(og)].sort((a, b) => a.p - b.p)}
        />
      )}

    </div>
  );
}


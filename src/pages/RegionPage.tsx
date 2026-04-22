import { useDeferredValue, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScopeStrip } from '@/components/common/ScopeStrip';
import { ObservedInAnalysesPanel } from '@/components/entity/ObservedInAnalysesPanel';
import { OverlappingBlocksPanel } from '@/components/entity/OverlappingBlocksPanel';
import { OverlappingGenesCard } from '@/components/region/OverlappingGenesCard';
import { useGeneModelsPartition } from '@/hooks/useGeneModel';
import { useOgRegionManifest } from '@/hooks/useOgRegion';
import { useCultivars } from '@/hooks/useCultivars';
import {
  computeOverlappingClusters,
  computeOverlappingGenes,
  cultivarPrefix,
  parseRange,
} from '@/lib/region-helpers';

const FLANK_BP = 5000;
/**
 * Keeps the Overlapping-genes list renderable on dense regions
 * (/region/baegilmi/chr01/0-44043118 → 6103 hits). DOM reconciliation
 * of 6k Link nodes is the last remaining search-time cost after the
 * dep-array and geneSearchText fixes. Users narrow the list with
 * the filter; a "Show all" toggle is available when they really
 * need the full view.
 */
const GENE_DISPLAY_LIMIT = 200;

export function RegionPage() {
  const { cultivar, chr, range } = useParams<{
    cultivar: string;
    chr: string;
    range: string;
  }>();

  // Stabilise parsed across renders so downstream useMemos memoize on the
  // real input change, not on `parseRange()` returning a fresh array every render.
  const parsed = useMemo(() => parseRange(range), [range]);
  const [start, end] = parsed ?? [0, 0];
  const rangeValid = parsed !== null;

  const prefix = cultivar ? cultivarPrefix(cultivar) : null;
  const { partition, loading: partitionLoading } = useGeneModelsPartition(prefix);
  const { manifest } = useOgRegionManifest();
  const { cultivars } = useCultivars();

  const cultivarName = useMemo(() => {
    if (!cultivar) return '';
    const c = cultivars.find((x) => x.id === cultivar);
    return c?.name ?? cultivar;
  }, [cultivar, cultivars]);

  const [functionQuery, setFunctionQuery] = useState('');
  // Keep the input field snappy while deferring the expensive filter /
  // list render behind React 19's concurrent scheduler.
  const deferredQuery = useDeferredValue(functionQuery);
  const [showAllGenes, setShowAllGenes] = useState(false);

  const overlappingGenes = useMemo(
    () =>
      computeOverlappingGenes({
        partition,
        cultivar: cultivar ?? null,
        chr: chr ?? null,
        start,
        end,
        rangeValid,
      }),
    [partition, rangeValid, cultivar, chr, start, end],
  );

  const visibleGenes = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    if (!q) return overlappingGenes;
    return overlappingGenes.filter((g) => g.searchText.includes(q));
  }, [overlappingGenes, deferredQuery]);

  const displayedGenes = useMemo(() => {
    if (showAllGenes) return visibleGenes;
    if (visibleGenes.length <= GENE_DISPLAY_LIMIT) return visibleGenes;
    return visibleGenes.slice(0, GENE_DISPLAY_LIMIT);
  }, [visibleGenes, showAllGenes]);

  const overlappingClusters = useMemo(
    () =>
      computeOverlappingClusters({
        manifest,
        cultivar: cultivar ?? null,
        chr: chr ?? null,
        start,
        end,
        rangeValid,
      }),
    [manifest, rangeValid, cultivar, chr, start, end],
  );

  if (!cultivar || !chr || !parsed) {
    return (
      <div className="py-12 text-center text-gray-500">
        Invalid region URL. Expected{' '}
        <code>/region/:cultivar/:chr/:start-:end</code>.
      </div>
    );
  }

  const span = end - start;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/cultivars" className="hover:text-green-700 hover:underline">
          ← Cultivars
        </Link>
        <span>/</span>
        <Link
          to={`/cultivar/${encodeURIComponent(cultivarName)}`}
          className="hover:text-green-700 hover:underline"
        >
          {cultivarName}
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium font-mono">
          {chr}:{start.toLocaleString()}-{end.toLocaleString()}
        </span>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            <span className="font-mono">
              {chr}:{start.toLocaleString()}-{end.toLocaleString()}
            </span>
            <span className="ml-2 text-sm font-normal text-gray-500">
              on {cultivarName} · {span.toLocaleString()} bp
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 flex flex-wrap gap-x-6 gap-y-1">
          <Stat label="Overlapping genes" value={`${overlappingGenes.length}`} />
          <Stat
            label="Overlapping OG clusters"
            value={`${overlappingClusters.length}`}
          />
          <Stat label="Span" value={`${span.toLocaleString()} bp`} />
        </CardContent>
      </Card>

      <ScopeStrip>
        Region view is coordinate-first. Gene coords come from the
        cultivar's funannotate GFF3, OG clusters from the anchor-cultivar
        coords in the graph manifest. Variants on an arbitrary region are
        deferred — use each OG cluster's anchor-locus variants tab for
        per-cluster VCF context.
      </ScopeStrip>

      {partitionLoading && (
        <p className="text-[11px] text-gray-400">
          Loading gene partition (~20–40 MB, one-time)…
        </p>
      )}

      <OverlappingGenesCard
        overlappingGenes={overlappingGenes}
        visibleGenes={visibleGenes}
        displayedGenes={displayedGenes}
        deferredQuery={deferredQuery}
        functionQuery={functionQuery}
        setFunctionQuery={setFunctionQuery}
        partitionLoading={partitionLoading}
        showAllGenes={showAllGenes}
        toggleShowAll={() => setShowAllGenes((v) => !v)}
        displayLimit={GENE_DISPLAY_LIMIT}
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Overlapping OG clusters
            <span className="ml-2 text-xs font-normal text-gray-500">
              anchor = {cultivarName}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {overlappingClusters.length === 0 ? (
            <p className="text-sm text-gray-500">
              No OG clusters anchored in this region.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 text-sm">
              {overlappingClusters.map((c) => (
                <li key={`${c.ogId}-${c.clusterId}`}>
                  <Link
                    to={`/og/${c.ogId}?cluster=${c.clusterId}`}
                    className="block py-1.5 px-1 rounded hover:bg-green-50 flex items-baseline justify-between gap-3"
                  >
                    <span className="font-mono text-gray-900">
                      {c.ogId}
                      <span className="ml-2 text-gray-400 text-[11px]">
                        cluster {c.clusterId}
                      </span>
                    </span>
                    <span className="text-[11px] text-gray-500 whitespace-nowrap font-mono">
                      {c.chr}:{c.start.toLocaleString()}-{c.end.toLocaleString()} · {c.geneCount}{' '}
                      gene{c.geneCount === 1 ? '' : 's'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {cultivar && chr && parsed && (
        <>
          <OverlappingBlocksPanel chr={chr} start={start} end={end} />
          <ObservedInAnalysesPanel
            entityType="region"
            entityId={`${cultivar}:${chr}:${start}-${end}`}
          />
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="text-sm font-medium text-gray-900 tabular-nums">
        {value}
      </div>
    </div>
  );
}

export { FLANK_BP };

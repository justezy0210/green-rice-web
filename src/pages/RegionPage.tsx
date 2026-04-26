import { useDeferredValue, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScopeStrip } from '@/components/common/ScopeStrip';
import { OverlappingBlocksPanel } from '@/components/entity/OverlappingBlocksPanel';
import { OverlappingGenesCard } from '@/components/region/OverlappingGenesCard';
import { RegionOverviewMap } from '@/components/region/RegionOverviewMap';
import { RegionTrackViz } from '@/components/region/RegionTrackViz';
import { TraitRibbon } from '@/components/discovery/TraitRibbon';
import { useGeneModelsPartition } from '@/hooks/useGeneModel';
import { useGeneIndexPartition } from '@/hooks/useGeneIndex';
import { useCultivars } from '@/hooks/useCultivars';
import { useChrBlocks } from '@/hooks/useChrBlocks';
import { useOverlappingBlocks } from '@/hooks/useOverlappingBlocks';
import { useSvEventsForRegion } from '@/hooks/useSvEventsForRegion';
import { useSvManifest } from '@/hooks/useSvMatrix';
import { useGenomeSummary } from '@/hooks/useGenomeSummary';
import { SV_RELEASE_ID } from '@/lib/releases';
import {
  computeChrGenes,
  computeOverlappingGenes,
  cultivarPrefix,
  parseRange,
} from '@/lib/region-helpers';
import {
  buildTraitCellsFromBlocks,
  representativeBlockPerTrait,
} from '@/lib/trait-ribbon-data';

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
  const { partition: indexPartition } = useGeneIndexPartition(prefix);
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

  const [highlightedGeneId, setHighlightedGeneId] = useState<string | null>(null);

  // `?og=<ogId>` narrows the track viz so genes of an "arrived-from"
  // orthogroup pop (indigo marker), preserving the narrative from the
  // originating block/OG page. Clearing the chip simply drops the param.
  // `?svScope=all` expands the SV lane to the full pangenome view;
  // default is cultivar-scoped to match the URL contract.
  const [searchParams, setSearchParams] = useSearchParams();
  const focusedOgId = searchParams.get('og');
  const svScope: 'cultivar' | 'all' =
    searchParams.get('svScope') === 'all' ? 'all' : 'cultivar';
  const clearFocusedOg = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('og');
    setSearchParams(next, { replace: true });
  };
  const toggleSvScope = () => {
    const next = new URLSearchParams(searchParams);
    if (svScope === 'cultivar') {
      next.set('svScope', 'all');
    } else {
      next.delete('svScope');
    }
    setSearchParams(next, { replace: true });
  };

  const overlappingGenes = useMemo(
    () =>
      computeOverlappingGenes({
        partition,
        indexPartition,
        cultivar: cultivar ?? null,
        chr: chr ?? null,
        start,
        end,
        rangeValid,
      }),
    [partition, indexPartition, rangeValid, cultivar, chr, start, end],
  );

  const chrGenes = useMemo(
    () => computeChrGenes({ partition, indexPartition, cultivar: cultivar ?? null, chr: chr ?? null }),
    [partition, indexPartition, cultivar, chr],
  );

  const { summary: genomeSummary } = useGenomeSummary(cultivar ?? undefined);
  const chrLength = chr ? genomeSummary?.assembly?.chromosomeLengths?.[chr] : undefined;

  const visibleGenes = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    if (!q) return overlappingGenes;
    return overlappingGenes.filter((g) => g.searchText.includes(q));
  }, [overlappingGenes, deferredQuery]);

  const { blocks: overlappingBlocks } = useOverlappingBlocks({
    chr: chr ?? null,
    start: rangeValid ? start : null,
    end: rangeValid ? end : null,
  });
  // Overview needs every curated block on the chr, independent of
  // the current window — otherwise navigating inside the chromosome
  // makes far-away curated bars blink out.
  const { blocks: chrBlocks } = useChrBlocks(chr ?? null);
  const traitCells = useMemo(
    () => buildTraitCellsFromBlocks(overlappingBlocks),
    [overlappingBlocks],
  );
  const traitRepresentatives = useMemo(
    () => representativeBlockPerTrait(overlappingBlocks),
    [overlappingBlocks],
  );

  const ogCount = useMemo(() => {
    const set = new Set<string>();
    for (const g of overlappingGenes) if (g.ogId) set.add(g.ogId);
    return set.size;
  }, [overlappingGenes]);

  const { events: svEvents, loading: svLoading } = useSvEventsForRegion({
    svReleaseId: SV_RELEASE_ID,
    chr: chr ?? null,
    start: rangeValid ? start : null,
    end: rangeValid ? end : null,
    cultivar: cultivar ?? null,
    scope: svScope,
  });
  // Sample count for the "all N cultivars" scope label. Reads the
  // active SV release manifest so the number tracks the pipeline
  // state, not a UI literal. Falls back to null while loading so the
  // header can say "all cultivars" without committing to a count.
  const { manifest: svManifest } = useSvManifest(SV_RELEASE_ID);
  const svSampleCount = svManifest?.sampleCount ?? null;

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
          <Stat label="Distinct OGs" value={`${ogCount}`} />
          <Stat label="Span" value={`${span.toLocaleString()} bp`} />
        </CardContent>
      </Card>

      <ScopeStrip>
        Region view is coordinate-first. Gene coords come from the
        cultivar's funannotate GFF3; OG assignment per gene comes from
        OrthoFinder. Variants on an arbitrary region are deferred — use
        each OG detail's anchor-locus variants tab for per-cluster VCF
        context. Discovery-scoped review blocks appear below.
      </ScopeStrip>

      {Object.keys(traitCells).length > 0 && (
        <Card>
          <CardContent className="py-3">
            <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-2">
              Trait coverage in this region
            </h3>
            <TraitRibbon
              activeTraitId={null}
              perTrait={traitCells}
              linkFor={(traitId) => {
                const rep = traitRepresentatives[traitId];
                if (!rep) return null;
                return `/discovery/${rep.runId}/block/${encodeURIComponent(rep.blockId)}`;
              }}
              title="Discovery runs with a block overlapping this window"
            />
          </CardContent>
        </Card>
      )}

      {partitionLoading && (
        <p className="text-[11px] text-gray-400">
          Loading gene partition (~20–40 MB, one-time)…
        </p>
      )}

      {chrGenes.length > 0 && (
        <RegionOverviewMap
          cultivar={cultivar}
          chr={chr}
          start={start}
          end={end}
          chrLength={chrLength}
          genes={chrGenes}
          blocks={chrBlocks}
        />
      )}

      {overlappingGenes.length > 0 && (
        <RegionTrackViz
          cultivar={cultivar}
          cultivarName={cultivarName}
          chr={chr}
          start={start}
          end={end}
          genes={overlappingGenes}
          svEvents={svEvents}
          svLoading={svLoading}
          highlightedGeneId={highlightedGeneId}
          focusedOgId={focusedOgId}
          onClearFocusedOg={clearFocusedOg}
          svScope={svScope}
          onToggleSvScope={toggleSvScope}
          svSampleCount={svSampleCount}
          overlappingBlocks={overlappingBlocks}
        />
      )}

      <OverlappingGenesCard
        overlappingGenes={overlappingGenes}
        visibleGenes={visibleGenes}
        deferredQuery={deferredQuery}
        functionQuery={functionQuery}
        setFunctionQuery={setFunctionQuery}
        partitionLoading={partitionLoading}
        highlightedGeneId={highlightedGeneId}
        onToggleHighlight={(id) =>
          setHighlightedGeneId((prev) => (prev === id ? null : id))
        }
      />

      {cultivar && chr && parsed && (
        <OverlappingBlocksPanel chr={chr} start={start} end={end} />
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

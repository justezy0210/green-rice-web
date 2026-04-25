import { useState } from 'react';
import { useOgRegion, useOgRegionManifest } from '@/hooks/useOgRegion';
import { OgDrawerAlleleFreqSection } from '@/components/explore/OgDrawerAlleleFreqSection';
import { OgAnchorTierBadge } from '@/components/explore/OgAnchorTierBadge';
import { ScopeStrip } from '@/components/common/ScopeStrip';
import { Button } from '@/components/ui/button';
import { ClusterPicker } from './ClusterPicker';
import {
  findManifestCluster,
  resolveClusterRegionStatus,
  statusCopy,
  type ClusterRegionStatus,
} from '@/lib/cluster-region-status';
import type { TierMetrics } from '@/lib/og-anchor-tier';
import { Layer2CoverageBadge } from './Layer2CoverageBadge';
import {
  ClusterHeader,
  EmptyState,
  FrameNote,
} from './af-tab-helpers';
import { toOgVariantSummary } from '@/lib/og-region-af-summary';
import type { GeneCluster, OgVariantSummary } from '@/types/orthogroup';

interface Props {
  ogId: string;
  selectedCluster?: GeneCluster | null;
  clusters?: GeneCluster[];
  onClusterSelect?: (c: GeneCluster) => void;
  afSummary: OgVariantSummary | null;
  groupLabels: string[];
  groupColorMap: Record<string, { bg: string; border: string }>;
  tierMetrics: TierMetrics | null;
  traitId: string | null;
  /** IDs with an extractor bundle. Cultivar clusters not in this set are
   * hidden from the picker (no data to show anyway). Reference cluster is
   * always kept when `afSummary` exists because it carries OG-level AF. */
  bundleAvailableIds?: Set<string>;
}

export function OgDetailAlleleFreqTab(props: Props) {
  const pickerClusters = (props.clusters ?? []).filter((c) => {
    if (c.source === 'reference') return !!props.afSummary;
    if (!props.bundleAvailableIds) return true;
    return props.bundleAvailableIds.has(c.id);
  });
  return (
    <div className="space-y-3">
      {pickerClusters.length > 0 && (
        <ClusterPicker
          clusters={pickerClusters}
          selectedCluster={props.selectedCluster ?? null}
          onClusterSelect={props.onClusterSelect}
        />
      )}
      <OgDetailAlleleFreqTabBody {...props} />
    </div>
  );
}

function OgDetailAlleleFreqTabBody({
  ogId,
  selectedCluster,
  afSummary,
  groupLabels,
  groupColorMap,
  tierMetrics,
  traitId,
}: Props) {
  const isReference = selectedCluster?.source === 'reference';
  const region = useOgRegion(
    ogId,
    !isReference ? selectedCluster?.id ?? null : null,
    traitId,
  );
  const { manifest } = useOgRegionManifest();
  const [showOgLevel, setShowOgLevel] = useState(false);
  const [showGatedAf, setShowGatedAf] = useState(false);

  const manifestEntry = !isReference && selectedCluster
    ? findManifestCluster(manifest, ogId, selectedCluster.id)
    : null;
  const regionStatus: ClusterRegionStatus | null = !isReference && selectedCluster
    ? resolveClusterRegionStatus(region.data, manifestEntry)
    : null;

  // Tier gating applies only to cultivar-anchored clusters, not the
  // IRGSP reference pseudo-cluster (which aggregates across gene bodies).
  const applyTierGating = !isReference && !!tierMetrics;
  const tier = tierMetrics?.tier;

  if (applyTierGating && tier === 'nonrepresentative' && !showGatedAf) {
    return (
      <div className="space-y-2">
        <ScopeStrip tone="hold">
          Anchor locus represents this OG poorly (occupancy{' '}
          {Math.round((tierMetrics?.occupancy ?? 0) * 100)}% of cultivars,
          threshold 40%). Anchor-locus AF is not shown by default — it
          would not be an OG-level signal for this cluster.
        </ScopeStrip>
        {tierMetrics && (
          <div className="px-1">
            <OgAnchorTierBadge metrics={tierMetrics} />
          </div>
        )}
        <div className="border border-gray-200 rounded-lg p-6 text-center text-xs text-gray-500">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowGatedAf(true)}
          >
            Show anyway (locus-local only)
          </Button>
        </div>
      </div>
    );
  }

  const tierHeader = applyTierGating && tierMetrics ? (
    <div className="flex flex-wrap items-center gap-2 px-1">
      <OgAnchorTierBadge metrics={tierMetrics} />
      {tier === 'mixed' && (
        <span className="text-[11px] text-amber-800">
          Mixed anchor occupancy — read as locus-local evidence, not OG-wide.
        </span>
      )}
    </div>
  ) : null;

  // IRGSP reference pseudo-cluster: use OG-level AF directly.
  if (isReference && afSummary) {
    return (
      <div className="space-y-2">
        <div className="text-[11px] text-gray-500 flex items-center gap-3 flex-wrap px-1">
          <span>
            Source:{' '}
            <span className="text-gray-600 font-medium">IRGSP reference view</span>
          </span>
          <span className="font-mono">
            {afSummary.geneRegions
              .map((r) => `${r.chr}:${r.start.toLocaleString()}-${r.end.toLocaleString()}`)
              .join(', ')}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-gray-300 bg-gray-50 text-gray-600">
            OG-level AF across linked IRGSP gene bodies
          </span>
          <Layer2CoverageBadge />
        </div>
        <FrameNote />
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
          <OgDrawerAlleleFreqSection
            summary={afSummary}
            groupLabels={groupLabels}
            groupColorMap={groupColorMap}
            title="IRGSP gene-body variants"
          />
        </div>
      </div>
    );
  }

  // No cluster selected — explicit prompt, not silent fallback.
  if (!selectedCluster) {
    return (
      <EmptyState
        title="Select a cluster to load variant rows"
        hint="This tab lists variants observed in the IRGSP region that the selected cluster lifts to. It is not an answer to why a cultivar has more or fewer gene copies."
      />
    );
  }

  if (region.loading) {
    return <p className="text-sm text-gray-400 py-8 text-center">Loading cluster variants…</p>;
  }

  const statusTone = regionStatus ? statusCopy(regionStatus) : null;

  // Cluster-aware path: region data available
  if (region.data) {
    const clusterAf = toOgVariantSummary(region.data);
    if (clusterAf && clusterAf.variants.length > 0) {
      const afSection = (
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
          <OgDrawerAlleleFreqSection
            summary={clusterAf}
            groupLabels={groupLabels}
            groupColorMap={groupColorMap}
          />
        </div>
      );
      return (
        <div className="space-y-2">
          <ClusterHeader region={region.data} statusTone={statusTone} />
          {tierHeader}
          <FrameNote />
          {statusTone?.caveat && (
            <p className={`text-[11px] px-2 py-1 rounded border ${statusTone.toneClass}`}>
              {statusTone.caveat}
            </p>
          )}
          {tier === 'mixed' ? (
            <details className="border border-amber-200 rounded-lg bg-amber-50/40 px-3 py-2">
              <summary className="cursor-pointer select-none text-[11px] text-amber-900">
                Show locus-local variant table ({clusterAf.totalVariants} variants) — not OG-wide
              </summary>
              <div className="mt-2">{afSection}</div>
            </details>
          ) : (
            afSection
          )}
        </div>
      );
    }
    // region present but no variants — surface status and empty-state.
    return (
      <EmptyState
        title={
          regionStatus?.kind === 'unmapped'
            ? 'Non-syntenic candidate — no variant rows in the lifted region'
            : 'No variant rows in the lifted IRGSP region for this cluster'
        }
        hint={statusTone?.caveat ?? undefined}
      />
    );
  }

  // No region.data → use the status table. Never silently show OG-level.
  if (showOgLevel && afSummary) {
    return (
      <div className="space-y-2">
        <div className="text-[11px] bg-amber-50 border border-amber-200 rounded px-3 py-2 text-amber-800">
          Using <strong>OG-level reference AF</strong> across all linked IRGSP gene bodies of this
          orthogroup. Not cluster-specific.
        </div>
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
          <OgDrawerAlleleFreqSection
            summary={afSummary}
            groupLabels={groupLabels}
            groupColorMap={groupColorMap}
          />
        </div>
      </div>
    );
  }

  return (
    <EmptyState
      title={
        regionStatus?.kind === 'unmapped'
          ? 'Non-syntenic candidate'
          : regionStatus?.kind === 'error'
            ? 'Region extraction failed'
            : 'Region data unavailable for this cluster'
      }
      hint={statusTone?.caveat ?? undefined}
      action={
        afSummary ? (
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="mt-3"
            onClick={() => setShowOgLevel(true)}
          >
            Use OG-level reference AF
          </Button>
        ) : null
      }
    />
  );
}


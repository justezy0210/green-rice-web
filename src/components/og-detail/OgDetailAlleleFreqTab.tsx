import { useState } from 'react';
import { useOgRegion, useOgRegionManifest } from '@/hooks/useOgRegion';
import { OgDrawerAlleleFreqSection } from '@/components/explore/OgDrawerAlleleFreqSection';
import {
  findManifestCluster,
  resolveClusterRegionStatus,
  statusCopy,
  type ClusterRegionStatus,
} from '@/lib/cluster-region-status';
import { Layer2CoverageBadge } from './Layer2CoverageBadge';
import type {
  GeneCluster,
  OgVariantSummary,
  RegionData,
} from '@/types/orthogroup';

interface Props {
  ogId: string;
  selectedCluster?: GeneCluster | null;
  afSummary: OgVariantSummary | null;
  groupLabels: string[];
  groupColorMap: Record<string, { bg: string; border: string }>;
}

export function OgDetailAlleleFreqTab({
  ogId,
  selectedCluster,
  afSummary,
  groupLabels,
  groupColorMap,
}: Props) {
  const isReference = selectedCluster?.source === 'reference';
  const region = useOgRegion(
    ogId,
    !isReference ? selectedCluster?.id ?? null : null,
  );
  const { manifest } = useOgRegionManifest();
  const [showOgLevel, setShowOgLevel] = useState(false);

  const manifestEntry = !isReference && selectedCluster
    ? findManifestCluster(manifest, ogId, selectedCluster.id)
    : null;
  const regionStatus: ClusterRegionStatus | null = !isReference && selectedCluster
    ? resolveClusterRegionStatus(region.data, manifestEntry)
    : null;

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
      return (
        <div className="space-y-2">
          <ClusterHeader region={region.data} statusTone={statusTone} />
          <FrameNote />
          {statusTone?.caveat && (
            <p className={`text-[11px] px-2 py-1 rounded border ${statusTone.toneClass}`}>
              {statusTone.caveat}
            </p>
          )}
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            <OgDrawerAlleleFreqSection
              summary={clusterAf}
              groupLabels={groupLabels}
              groupColorMap={groupColorMap}
            />
          </div>
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
          <button
            type="button"
            onClick={() => setShowOgLevel(true)}
            className="mt-3 text-xs px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
          >
            Use OG-level reference AF
          </button>
        ) : null
      }
    />
  );
}

function ClusterHeader({
  region,
  statusTone,
}: {
  region: RegionData;
  statusTone: ReturnType<typeof statusCopy> | null;
}) {
  const lift = region.liftover;
  return (
    <div className="text-[11px] text-gray-500 flex items-center gap-3 flex-wrap px-1">
      <span>
        Source:{' '}
        <span className="text-green-700 font-medium">cluster-derived lifted region</span>
      </span>
      <span>
        Anchor:{' '}
        <span className="font-mono text-gray-700">{region.anchor.cultivar}</span>
      </span>
      <span className="font-mono">
        {region.anchor.regionSpan.chr}:
        {region.anchor.regionSpan.start.toLocaleString()}-
        {region.anchor.regionSpan.end.toLocaleString()}
      </span>
      {lift.irgspRegion && (
        <span>
          → IRGSP{' '}
          <span className="font-mono">
            {lift.irgspRegion.chr}:{lift.irgspRegion.start.toLocaleString()}-
            {lift.irgspRegion.end.toLocaleString()}
          </span>
        </span>
      )}
      {statusTone?.badge && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${statusTone.toneClass}`}>
          {statusTone.badge}
        </span>
      )}
      <Layer2CoverageBadge />
    </div>
  );
}

function FrameNote() {
  return (
    <p className="text-[11px] text-gray-600 bg-gray-50 border border-gray-200 rounded px-3 py-2">
      Supporting variant evidence for this candidate. AF values are ALT-path frequencies within each
      phenotype group — not per-cultivar copy counts, and not proof of which variant explains the
      trait or the presence/absence of this OG.
    </p>
  );
}


function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-8 text-center text-sm text-gray-600">
      {title}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      {action}
    </div>
  );
}

function toOgVariantSummary(r: RegionData): OgVariantSummary | null {
  if (!r.alleleFrequency) {
    return r.liftover.irgspRegion
      ? {
          geneRegions: [
            {
              geneId: `${r.anchor.cultivar}_cluster`,
              chr: r.liftover.irgspRegion.chr,
              start: r.liftover.irgspRegion.start,
              end: r.liftover.irgspRegion.end,
            },
          ],
          totalVariants: 0,
          variants: [],
        }
      : null;
  }
  const variants = r.alleleFrequency.variants;
  return {
    geneRegions: r.liftover.irgspRegion
      ? [
          {
            geneId: `${r.anchor.cultivar}_cluster`,
            chr: r.liftover.irgspRegion.chr,
            start: r.liftover.irgspRegion.start,
            end: r.liftover.irgspRegion.end,
          },
        ]
      : [],
    totalVariants: variants.length,
    // Default to genomic position (chr then pos). ΔAF ordering was removed
    // to prevent reading AF as a ranking axis — it is supporting evidence only.
    variants: [...variants].sort((a, b) => {
      if (a.chr !== b.chr) return a.chr.localeCompare(b.chr);
      return a.pos - b.pos;
    }),
  };
}

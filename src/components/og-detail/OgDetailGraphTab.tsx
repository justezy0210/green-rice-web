import { useMemo, useState } from 'react';
import { useOgTubeMap } from '@/hooks/useOgTubeMap';
import { useOgRegion, useOgRegionManifest } from '@/hooks/useOgRegion';
import { TubeMapRenderer } from './TubeMapRenderer';
import { ClusterPicker } from './ClusterPicker';
import { SortToggle } from './SortToggle';
import {
  findManifestCluster,
  resolveClusterRegionStatus,
  statusCopy,
} from '@/lib/cluster-region-status';
import { Layer2CoverageBadge } from './Layer2CoverageBadge';
import type { TubeMapSortMode } from '@/lib/tube-map-ordering';
import type { CultivarGroupAssignment } from '@/types/grouping';
import type {
  GeneCluster,
  OgGeneCoords,
  OgTubeMapData,
  RegionData,
} from '@/types/orthogroup';

interface Props {
  ogId?: string | null;
  selectedCluster?: GeneCluster | null;
  clusters?: GeneCluster[];
  onClusterSelect?: (c: GeneCluster) => void;
  coords?: OgGeneCoords | null;
  groupByCultivar?: Record<string, CultivarGroupAssignment> | null;
  groupColorMap?: Record<string, { bg: string; border: string }>;
  groupLabels?: string[];
}

export function OgDetailGraphTab({
  ogId,
  selectedCluster,
  clusters = [],
  onClusterSelect,
  coords,
  groupByCultivar,
  groupColorMap = {},
  groupLabels,
}: Props) {
  const isReference = selectedCluster?.source === 'reference';
  const region = useOgRegion(
    ogId ?? null,
    !isReference ? selectedCluster?.id ?? null : null,
  );
  // Reference view always uses default IRGSP tubemap. Cultivar cluster falls
  // back to default only if its og_region is missing.
  const tubemap = useOgTubeMap(region.data && !isReference ? null : ogId ?? null);
  const [sortMode, setSortMode] = useState<TubeMapSortMode>('phenotype');

  const { manifest } = useOgRegionManifest();
  const manifestEntry =
    !isReference && selectedCluster && ogId
      ? findManifestCluster(manifest, ogId, selectedCluster.id)
      : null;
  const regionStatus =
    !isReference && selectedCluster
      ? resolveClusterRegionStatus(region.data, manifestEntry)
      : null;
  const statusTone = regionStatus ? statusCopy(regionStatus) : null;

  const regionTubeData = useMemo<OgTubeMapData | null>(
    () => (region.data ? regionToTubeData(region.data) : null),
    [region.data],
  );

  const picker = (
    <ClusterPicker
      clusters={clusters}
      selectedCluster={selectedCluster ?? null}
      onClusterSelect={onClusterSelect}
    />
  );

  if (region.loading || tubemap.loading) {
    return (
      <div className="space-y-3">
        {picker}
        <p className="text-sm text-gray-400 py-8 text-center">Loading graph data…</p>
      </div>
    );
  }

  // Cluster-specific region available
  if (region.data && regionTubeData) {
    const r = region.data;
    const graphOk = r.graph && r.graph.nodes.length > 0;
    return (
      <div className="space-y-3">
        {picker}
        <GraphHeader
          source="cluster"
          cultivar={r.anchor.cultivar}
          chr={r.anchor.regionSpan.chr}
          start={r.anchor.regionSpan.start}
          end={r.anchor.regionSpan.end}
          nodes={r.graph?.nodes.length ?? 0}
          paths={r.graph?.paths.length ?? 0}
          statusBadge={statusTone?.badge ?? null}
          statusTone={statusTone?.toneClass ?? null}
        />
        {statusTone?.caveat && (
          <p className={`text-[11px] px-2 py-1 rounded border ${statusTone.toneClass}`}>
            {statusTone.caveat}
          </p>
        )}
        {graphOk ? (
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white p-2">
            <SortToggle sortMode={sortMode} onChange={setSortMode} />
            <TubeMapRenderer
              data={regionTubeData}
              coords={coords ?? null}
              groupByCultivar={groupByCultivar}
              groupColorMap={groupColorMap}
              groupLabelsOrder={groupLabels}
              sortMode={sortMode}
            />
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg p-8 text-center text-sm text-gray-500">
            Graph extraction failed for this cluster ({r.status.graph}).
          </div>
        )}
        <p className="text-[10px] text-gray-400">
          Cluster-anchored pangenome graph. Region span: {r.anchor.regionSpan.chr}:
          {r.anchor.regionSpan.start.toLocaleString()}–{r.anchor.regionSpan.end.toLocaleString()}{' '}
          ({r.anchor.flankBp.toLocaleString()}bp flank).
        </p>
      </div>
    );
  }

  // Fallback: OG-level default graph (used for both reference cluster + missing region)
  if (tubemap.data) {
    return (
      <div className="space-y-3">
        {picker}
        <GraphHeader
          source={isReference ? 'reference' : 'default'}
          anchorGene={tubemap.data.anchorGene}
          region={tubemap.data.region}
          nodes={tubemap.data.nodes.length}
          paths={tubemap.data.paths.length}
          selectedClusterId={!isReference ? selectedCluster?.id ?? null : null}
          statusBadge={statusTone?.badge ?? null}
          statusTone={statusTone?.toneClass ?? null}
        />
        {statusTone?.caveat && (
          <p className={`text-[11px] px-2 py-1 rounded border ${statusTone.toneClass}`}>
            {statusTone.caveat}
          </p>
        )}
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white p-2">
          <SortToggle sortMode={sortMode} onChange={setSortMode} />
          <TubeMapRenderer
            data={tubemap.data}
            coords={coords ?? null}
            groupByCultivar={groupByCultivar}
            groupColorMap={groupColorMap}
            groupLabelsOrder={groupLabels}
            sortMode={sortMode}
          />
        </div>
        <p className="text-[10px] text-gray-400">
          {isReference
            ? 'Reference-only graph: the default IRGSP-anchored pangenome.'
            : 'Reference-only fallback: IRGSP-anchored pangenome. A cluster-derived graph is not currently available for the selected cluster.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {picker}
      <div className="border border-gray-200 rounded-lg p-8 text-center text-sm text-gray-500">
        No pangenome graph data for this orthogroup.
        <p className="text-xs text-gray-400 mt-1">
          No IRGSP-anchored default graph is available, and no cluster-derived graph has been
          produced for any cluster of this OG.
        </p>
      </div>
    </div>
  );
}

function GraphHeader(
  props:
    | {
        source: 'cluster';
        cultivar: string;
        chr: string;
        start: number;
        end: number;
        nodes: number;
        paths: number;
        statusBadge: string | null;
        statusTone: string | null;
      }
    | {
        source: 'default' | 'reference';
        anchorGene: string;
        region: string;
        nodes: number;
        paths: number;
        selectedClusterId: string | null;
        statusBadge: string | null;
        statusTone: string | null;
      },
) {
  if (props.source === 'cluster') {
    return (
      <div className="text-xs text-gray-500 flex items-center gap-4 flex-wrap">
        <span>
          Source:{' '}
          <span className="text-green-700 font-medium">cluster-derived lifted region</span>
        </span>
        <span>
          Anchor:{' '}
          <span className="font-mono font-medium text-gray-700">{props.cultivar}</span>
        </span>
        <span className="font-mono">
          {props.chr}:{props.start.toLocaleString()}-{props.end.toLocaleString()}
        </span>
        <span>
          {props.nodes} nodes · {props.paths} paths
        </span>
        {props.statusBadge && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${props.statusTone ?? ''}`}>
            {props.statusBadge}
          </span>
        )}
        <Layer2CoverageBadge />
      </div>
    );
  }
  const isRef = props.source === 'reference';
  const sourceLabel = isRef ? 'IRGSP reference view' : 'Reference-only fallback';
  const sourceClass = isRef ? 'text-gray-600' : 'text-amber-700';
  return (
    <div className="text-xs text-gray-500 space-y-1">
      <div className="flex items-center gap-4 flex-wrap">
        <span>
          Source:{' '}
          <span className={`${sourceClass} font-medium`}>{sourceLabel}</span>
        </span>
        {props.statusBadge && !isRef && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${props.statusTone ?? ''}`}>
            {props.statusBadge}
          </span>
        )}
        <span>
          Anchor:{' '}
          <span className="font-mono font-medium text-gray-700">{props.anchorGene}</span>
        </span>
        <span className="font-mono">{props.region}</span>
        <span>
          {props.nodes} nodes · {props.paths} paths
        </span>
        <Layer2CoverageBadge />
      </div>
      {props.selectedClusterId && (
        <div className="text-[11px] text-amber-700">
          Selected cluster:{' '}
          <span className="font-mono">{props.selectedClusterId}</span>
          {' '}— cluster-level graph pending batch release.
        </div>
      )}
    </div>
  );
}

function regionToTubeData(r: RegionData): OgTubeMapData {
  return {
    ogId: r.ogId,
    region: `${r.anchor.regionSpan.chr}:${r.anchor.regionSpan.start}-${r.anchor.regionSpan.end}`,
    anchorGene: r.anchor.cultivar,
    schemaVersion: r.schemaVersion,
    nodes: r.graph?.nodes ?? [],
    edges: r.graph?.edges ?? [],
    paths: r.graph?.paths ?? [],
    annotate: {},
  };
}

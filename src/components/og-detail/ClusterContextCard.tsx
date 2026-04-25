import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { IRGSP_DISPLAY_NAME } from '@/lib/irgsp-constants';
import {
  buildReferenceCluster,
  computeGroupPresenceForCluster,
  formatClusterSummary,
  type PresenceCount,
} from '@/lib/og-gene-clusters';
import type {
  GeneCluster,
  OgGeneCoords,
  OgVariantSummary,
  OrthogroupRepresentative,
} from '@/types/orthogroup';
import type { CultivarGroupAssignment } from '@/types/grouping';

interface Props {
  clusters: GeneCluster[];
  selectedClusterId: string | null;
  onClusterSelect?: (cluster: GeneCluster) => void;
  representative?: OrthogroupRepresentative | null;
  afSummary?: OgVariantSummary | null;
  coords?: OgGeneCoords | null;
  groupByCultivar?: Record<string, CultivarGroupAssignment> | null;
  groupLabels?: string[];
  /** IDs for which an extractor graph/AF bundle exists. */
  bundleAvailableIds?: Set<string>;
}

/**
 * Compact cluster context for OG Detail. Surfaces:
 *   - IRGSP reference transcripts (what the anchor is tied to)
 *   - Per-cluster summary with trait-group presence counts
 * Replaces the older Gene Locations tab — Gene-level drill-down moves to
 * the dedicated `/genes/:id` page. This card lives between the PAV card
 * and the Anchor-locus Variants section as the cluster-choice affordance.
 */
export function ClusterContextCard({
  clusters,
  selectedClusterId,
  onClusterSelect,
  representative,
  afSummary,
  coords,
  groupByCultivar,
  groupLabels = [],
  bundleAvailableIds,
}: Props) {
  const refCluster = useMemo(
    () => buildReferenceCluster(representative ?? null, afSummary ?? null),
    [representative, afSummary],
  );

  const cultivarClusters = useMemo(
    () => clusters.filter((c) => c.source === 'cultivar'),
    [clusters],
  );

  const presenceByClusterId = useMemo(() => {
    const map: Record<string, Record<string, PresenceCount>> = {};
    for (const c of cultivarClusters) {
      map[c.id] = computeGroupPresenceForCluster(
        c,
        coords ?? null,
        groupByCultivar,
        groupLabels,
      );
    }
    return map;
  }, [cultivarClusters, coords, groupByCultivar, groupLabels]);

  const hasIrgsp =
    !!representative && representative.transcripts.length > 0;
  if (!hasIrgsp && cultivarClusters.length === 0) {
    return null;
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      {hasIrgsp && (
        <IrgspHeader
          representative={representative!}
          refCluster={refCluster}
          selected={selectedClusterId === refCluster?.id}
          onClusterSelect={onClusterSelect}
          afSummary={afSummary}
        />
      )}
      {cultivarClusters.length > 0 && (
        <ul className="divide-y divide-gray-100 text-xs">
          {cultivarClusters.map((c) => {
            const selected = selectedClusterId === c.id;
            const presence = presenceByClusterId[c.id];
            const hasBundle = bundleAvailableIds
              ? bundleAvailableIds.has(c.id)
              : undefined;
            return (
              <ClusterRow
                key={c.id}
                cluster={c}
                selected={selected}
                presence={presence}
                groupLabels={groupLabels}
                hasBundle={hasBundle}
                onSelect={onClusterSelect}
              />
            );
          })}
        </ul>
      )}
    </section>
  );
}

function IrgspHeader({
  representative,
  refCluster,
  selected,
  onClusterSelect,
  afSummary,
}: {
  representative: OrthogroupRepresentative;
  refCluster: GeneCluster | null;
  selected: boolean;
  onClusterSelect?: (c: GeneCluster) => void;
  afSummary?: OgVariantSummary | null;
}) {
  const regions = afSummary?.geneRegions ?? [];
  const regionByGene = new Map<string, { chr: string; start: number; end: number }>();
  for (const r of regions) regionByGene.set(r.geneId, r);
  const clickable = !!(refCluster && onClusterSelect);

  return (
    <section
      className={`px-4 py-2.5 text-[11px] border-b border-gray-100 ${
        selected ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-700'
      }`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-medium">{IRGSP_DISPLAY_NAME}</span>
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded border ${
            selected
              ? 'border-gray-600 bg-gray-800 text-gray-200'
              : 'border-gray-300 bg-white text-gray-600'
          }`}
        >
          reference
        </span>
        <span className={selected ? 'text-gray-400' : 'text-gray-500'}>
          {representative.transcripts.length} transcript
          {representative.transcripts.length > 1 ? 's' : ''}
        </span>
        {clickable && (
          <Button
            type="button"
            variant={selected ? 'secondary' : 'outline'}
            size="xs"
            onClick={() => onClusterSelect!(refCluster!)}
            className={`ml-auto text-[10px] ${selected ? 'border-gray-600 bg-gray-800 text-gray-200' : ''}`}
          >
            {selected ? 'Selected' : 'View IRGSP reference'}
          </Button>
        )}
      </div>
      <ul className="mt-1.5 space-y-0.5">
        {representative.transcripts.map((tx) => {
          const geneIdBase = tx.replace(/t(\d+)-\d+$/, 'g$1');
          const region =
            regionByGene.get(tx) ||
            regionByGene.get(geneIdBase) ||
            [...regionByGene.values()][0];
          const desc = representative.descriptions?.[tx];
          return (
            <li key={tx} className="font-mono">
              <span>{tx}</span>
              {region && (
                <span className={`ml-2 ${selected ? 'text-gray-300' : 'text-gray-500'}`}>
                  {region.chr}:{region.start.toLocaleString()}-
                  {region.end.toLocaleString()}
                </span>
              )}
              {desc && desc !== 'NA' && (
                <span
                  className={`ml-2 font-sans text-[10px] ${
                    selected ? 'text-gray-300' : 'text-gray-500'
                  }`}
                >
                  — {desc}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ClusterRow({
  cluster,
  selected,
  presence,
  groupLabels,
  hasBundle,
  onSelect,
}: {
  cluster: GeneCluster;
  selected: boolean;
  presence?: Record<string, PresenceCount>;
  groupLabels: string[];
  hasBundle: boolean | undefined;
  onSelect?: (c: GeneCluster) => void;
}) {
  return (
    <li>
      {/* raw: wide row-selector with flex-wrap content + selected ring state — Button primitive doesn't fit row-as-button layout. */}
      <button
        type="button"
        onClick={() => onSelect?.(cluster)}
        className={`w-full text-left px-4 py-2 flex flex-wrap items-center gap-x-3 gap-y-1 transition-colors ${
          selected ? 'bg-green-50 ring-1 ring-green-300' : 'hover:bg-gray-50'
        }`}
      >
        {hasBundle !== undefined && (
          <span
            aria-hidden
            title={hasBundle ? 'has variant bundle' : 'no variant bundle'}
            className={hasBundle ? 'text-green-600' : 'text-gray-300'}
          >
            {hasBundle ? '●' : '○'}
          </span>
        )}
        <span className="font-mono text-gray-900">{cluster.cultivar}</span>
        <span className="font-mono text-gray-500">
          {cluster.chr}:{(cluster.start / 1_000_000).toFixed(2)}M
        </span>
        <span className="text-gray-500">{formatClusterSummary(cluster)}</span>
        {groupLabels.length > 0 && presence && (
          <span className="ml-auto flex flex-wrap gap-2">
            {groupLabels.map((g) => {
              const p = presence[g];
              if (!p || p.total === 0) return null;
              return (
                <span key={g} className="tabular-nums text-gray-500">
                  <span className="text-gray-400">{g}</span>{' '}
                  <span
                    className={
                      p.present === p.total
                        ? 'text-gray-900'
                        : p.present === 0
                          ? 'text-gray-400'
                          : 'text-amber-700'
                    }
                  >
                    {p.present}/{p.total}
                  </span>
                </span>
              );
            })}
          </span>
        )}
      </button>
    </li>
  );
}

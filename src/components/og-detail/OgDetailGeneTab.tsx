import { useMemo } from 'react';
import { useOgGeneCoords } from '@/hooks/useOgGeneCoords';
import {
  buildGeneClusters,
  computeGroupPresenceForCluster,
  formatClusterSummary,
  type PresenceCount,
} from '@/lib/og-gene-clusters';
import type {
  GeneCluster,
  OgVariantSummary,
  OrthogroupDiffDocument,
  OrthogroupRepresentative,
} from '@/types/orthogroup';
import type { CultivarGroupAssignment } from '@/types/grouping';
import { IrgspRefSection } from './IrgspRefSection';

interface Props {
  ogId: string;
  members: Record<string, string[]> | null;
  loading: boolean;
  cultivarNameMap: Record<string, string>;
  groupByCultivar: Record<string, CultivarGroupAssignment> | null;
  groupColorMap: Record<string, { bg: string; border: string }>;
  diffDoc: OrthogroupDiffDocument | null;
  representative?: OrthogroupRepresentative | null;
  afSummary?: OgVariantSummary | null;
  onClusterSelect?: (cluster: GeneCluster) => void;
  selectedClusterId?: string | null;
}

export function OgDetailGeneTab({
  ogId,
  members,
  loading: membersLoading,
  cultivarNameMap,
  groupByCultivar,
  groupColorMap,
  diffDoc,
  representative,
  afSummary,
  onClusterSelect,
  selectedClusterId,
}: Props) {
  const { data: coords, loading: coordsLoading } = useOgGeneCoords(ogId);

  // Build clusters from coordinates
  const allClusters = useMemo(
    () => (coords ? buildGeneClusters(coords) : []),
    [coords],
  );

  const clustersByCultivar = useMemo(() => {
    const grouped: Record<string, GeneCluster[]> = {};
    for (const c of allClusters) {
      if (!grouped[c.cultivar]) grouped[c.cultivar] = [];
      grouped[c.cultivar].push(c);
    }
    return grouped;
  }, [allClusters]);

  const groupLabelsOrder = useMemo(
    () => diffDoc?.groupLabels ?? [],
    [diffDoc],
  );

  // Presence counts per cluster: early 8/8 · late 2/5
  const presenceByClusterId = useMemo(() => {
    const map: Record<string, Record<string, PresenceCount>> = {};
    for (const c of allClusters) {
      map[c.id] = computeGroupPresenceForCluster(
        c,
        coords ?? null,
        groupByCultivar,
        groupLabelsOrder,
      );
    }
    return map;
  }, [allClusters, coords, groupByCultivar, groupLabelsOrder]);

  // Sort cultivars by group
  const cultivarIds = useMemo(() => {
    const allCultivars = new Set<string>();
    if (members) Object.keys(members).forEach((c) => allCultivars.add(c));
    if (coords) Object.keys(coords).forEach((c) => allCultivars.add(c));

    const groupLabels = diffDoc?.groupLabels ?? [];
    const rank = (cid: string): number => {
      const lbl = groupByCultivar?.[cid]?.groupLabel;
      if (!lbl) return groupLabels.length;
      const idx = groupLabels.indexOf(lbl);
      return idx === -1 ? groupLabels.length : idx;
    };
    return Array.from(allCultivars).sort((a, b) => {
      const ra = rank(a);
      const rb = rank(b);
      if (ra !== rb) return ra - rb;
      return a.localeCompare(b);
    });
  }, [members, coords, groupByCultivar, diffDoc]);

  if (membersLoading || coordsLoading) {
    return <p className="text-sm text-gray-400 py-8 text-center">Loading gene members…</p>;
  }

  if (cultivarIds.length === 0) {
    return (
      <div className="border border-gray-200 rounded-lg p-8 text-center text-sm text-gray-500">
        No gene members found for this orthogroup.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-gray-400">
        An orthogroup is not a single locus. Members are grouped by sequence
        similarity, so cultivar copies can sit on different chromosomes than
        the IRGSP reference. Click a cluster to set the page focus.
      </p>
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white divide-y divide-gray-100">
        <IrgspRefSection
          representative={representative}
          afSummary={afSummary}
          onClusterSelect={onClusterSelect}
          selectedClusterId={selectedClusterId ?? null}
        />
        {cultivarIds.map((cid) => (
          <CultivarSection
            key={cid}
            cultivarId={cid}
            cultivarName={cultivarNameMap[cid] ?? cid}
            geneIds={members?.[cid] ?? []}
            clusters={clustersByCultivar[cid] ?? []}
            presenceByClusterId={presenceByClusterId}
            groupLabelsOrder={groupLabelsOrder}
            groupLabel={groupByCultivar?.[cid]?.groupLabel}
            groupColor={
              groupByCultivar?.[cid]?.groupLabel
                ? groupColorMap[groupByCultivar[cid].groupLabel] ?? null
                : null
            }
            groupColorMap={groupColorMap}
            onClusterSelect={onClusterSelect}
            selectedClusterId={selectedClusterId ?? null}
          />
        ))}
      </div>
    </div>
  );
}

function CultivarSection({
  cultivarName,
  geneIds,
  clusters,
  presenceByClusterId,
  groupLabelsOrder,
  groupLabel,
  groupColor,
  groupColorMap,
  onClusterSelect,
  selectedClusterId,
}: {
  cultivarId: string;
  cultivarName: string;
  geneIds: string[];
  clusters: GeneCluster[];
  presenceByClusterId: Record<string, Record<string, PresenceCount>>;
  groupLabelsOrder: string[];
  groupLabel?: string;
  groupColor: { bg: string; border: string } | null;
  groupColorMap: Record<string, { bg: string; border: string }>;
  onClusterSelect?: (c: GeneCluster) => void;
  selectedClusterId: string | null;
}) {
  return (
    <section
      className="px-4 py-3 text-xs border-l-4"
      style={{ borderLeftColor: groupColor?.border ? withAlpha(groupColor.border, 0.35) : 'transparent' }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="font-medium text-gray-900">{cultivarName}</span>
        <span className="text-gray-400">annotated OG members: {geneIds.length}</span>
        {groupLabel && groupColor && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded border"
            style={{
              backgroundColor: withAlpha(groupColor.bg, 0.2),
              borderColor: withAlpha(groupColor.border, 0.35),
              color: withAlpha(groupColor.border, 0.9),
            }}
          >
            {groupLabel}
          </span>
        )}
      </div>

      {clusters.length === 0 && geneIds.length === 0 && (
        <p className="text-gray-300 italic">no genes</p>
      )}

      {clusters.length === 0 && geneIds.length > 0 && (
        <p className="text-gray-400 italic">coordinates not available</p>
      )}

      <ul className="space-y-1">
        {clusters.map((c) => {
          const active = c.id === selectedClusterId;
          const presence = presenceByClusterId[c.id];
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onClusterSelect?.(c)}
                disabled={!onClusterSelect}
                className={`w-full text-left px-2 py-1 rounded font-mono text-[11px] transition-colors ${
                  active
                    ? 'bg-green-100 text-green-800 ring-1 ring-green-300'
                    : 'hover:bg-gray-50 text-gray-700'
                } ${onClusterSelect ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <span className="mr-2">{formatClusterSummary(c)}</span>
                {presence && (
                  <PresenceRow
                    presence={presence}
                    order={groupLabelsOrder}
                    groupColorMap={groupColorMap}
                  />
                )}
                <span className="block text-[9px] text-gray-400 mt-0.5 font-mono">
                  {c.genes.map((g) => g.id.replace(/\.t\d+$/, '')).join(', ')}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function PresenceRow({
  presence,
  order,
  groupColorMap,
}: {
  presence: Record<string, PresenceCount>;
  order: string[];
  groupColorMap: Record<string, { bg: string; border: string }>;
}) {
  const parts = order
    .map((lbl) => ({ lbl, p: presence[lbl] }))
    .filter((x) => x.p && x.p.total > 0);
  if (parts.length === 0) return null;
  return (
    <span
      className="ml-2 text-[10px] text-gray-500 font-sans"
      title="Same-chromosome annotated OG-member presence: cultivars (per group) with an annotated OG member anywhere on this cluster's chromosome. Not locus-resolved — a gene elsewhere on the same chromosome still counts."
    >
      <span className="text-gray-400 mr-1">same-chr:</span>
      {parts.map((x, i) => {
        const c = groupColorMap[x.lbl];
        return (
          <span key={x.lbl}>
            {i > 0 && <span className="text-gray-300 mx-1">·</span>}
            <span style={{ color: c ? withAlpha(c.border, 0.95) : undefined }}>
              {x.lbl} {x.p.present}/{x.p.total}
            </span>
          </span>
        );
      })}
    </span>
  );
}

function withAlpha(rgba: string, alpha: number): string {
  return rgba.replace(/rgba?\(([^)]+)\)/, (_, inner: string) => {
    const parts = inner.split(',').map((s) => s.trim());
    return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
  });
}

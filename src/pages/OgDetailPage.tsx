import { useCallback, useMemo } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { OgDetailAlleleFreqTab } from '@/components/og-detail/OgDetailAlleleFreqTab';
import { OgDetailGeneTab } from '@/components/og-detail/OgDetailGeneTab';
import { OgDetailGraphTab } from '@/components/og-detail/OgDetailGraphTab';
import { OgAnchorTierBadge } from '@/components/explore/OgAnchorTierBadge';
import { ScopeStrip } from '@/components/common/ScopeStrip';
import { useOrthogroupDiff } from '@/hooks/useOrthogroupDiff';
import { useOrthogroupDiffEntries } from '@/hooks/useOrthogroupDiffEntries';
import { useOgDrilldown } from '@/hooks/useOgDrilldown';
import { useOgAlleleFreq } from '@/hooks/useOgAlleleFreq';
import { useOgGeneCoords } from '@/hooks/useOgGeneCoords';
import { useCultivars } from '@/hooks/useCultivars';
import { buildGroupColorMap } from '@/components/dashboard/distribution-helpers';
import { buildGeneClusters, buildReferenceCluster, formatClusterSummary } from '@/lib/og-gene-clusters';
import { classifyAnchorTier } from '@/lib/og-anchor-tier';
import type { TraitId } from '@/types/grouping';
import type { OrthogroupDiffEntry, GeneCluster } from '@/types/orthogroup';

const TABS = ['members', 'af', 'graph'] as const;
type TabId = (typeof TABS)[number];
const TAB_LABELS: Record<TabId, string> = {
  members: 'Gene Locations',
  af: 'Anchor-locus Variants',
  graph: 'Pangenome Graph',
};

function isTab(v: string | null): v is TabId {
  return v !== null && (TABS as readonly string[]).includes(v);
}

export function OgDetailPage() {
  const { ogId } = useParams<{ ogId: string }>();
  const [params, setParams] = useSearchParams();

  const traitId = (params.get('trait') ?? null) as TraitId | null;
  const rawTab = params.get('tab');
  const activeTab: TabId = isTab(rawTab) ? rawTab : 'members';
  const selectedClusterId = params.get('cluster');

  const { doc: diffDoc, groupingDoc } = useOrthogroupDiff(traitId);
  const entriesState = useOrthogroupDiffEntries(diffDoc);
  const alleleFreq = useOgAlleleFreq(
    traitId,
    diffDoc?.orthofinderVersion ?? null,
    diffDoc?.groupingVersion ?? null,
  );
  const version = diffDoc?.orthofinderVersion ?? null;
  const { members, loading: membersLoading } = useOgDrilldown(ogId ?? null, version);
  const { data: ogCoords } = useOgGeneCoords(ogId ?? null);
  const { cultivars } = useCultivars();

  const cultivarNameMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of cultivars) m[c.id] = c.name;
    return m;
  }, [cultivars]);

  const groupByCultivar = groupingDoc?.assignments ?? null;
  const groupColorMap = useMemo(
    () => (groupByCultivar ? buildGroupColorMap(groupByCultivar) : {}),
    [groupByCultivar],
  );

  const diffEntry: OrthogroupDiffEntry | undefined = useMemo(() => {
    if (!ogId) return undefined;
    if (entriesState.kind === 'ready') {
      return entriesState.payload.entries.find((e) => e.orthogroup === ogId);
    }
    if (entriesState.kind === 'legacy') {
      return entriesState.entries.find((e) => e.orthogroup === ogId);
    }
    return undefined;
  }, [entriesState, ogId]);

  const afSummary = ogId ? alleleFreq?.ogs[ogId] ?? null : null;
  const rep = diffEntry?.representative;

  // Build clusters: cultivar-anchored (from coords) + IRGSP reference pseudo-cluster
  const clusters = useMemo(() => {
    const cultivarClusters = ogCoords ? buildGeneClusters(ogCoords) : [];
    const refCluster = buildReferenceCluster(rep ?? null, afSummary);
    return refCluster ? [refCluster, ...cultivarClusters] : cultivarClusters;
  }, [ogCoords, rep, afSummary]);

  const selectedCluster: GeneCluster | null = useMemo(() => {
    if (!selectedClusterId) return clusters[0] ?? null;
    return clusters.find((c) => c.id === selectedClusterId) ?? clusters[0] ?? null;
  }, [clusters, selectedClusterId]);

  const tierMetrics = useMemo(() => {
    if (!selectedCluster || selectedCluster.source === 'reference') return null;
    if (!ogCoords) return null;
    return classifyAnchorTier(selectedCluster, ogCoords);
  }, [selectedCluster, ogCoords]);

  const primaryDesc = rep
    ? Object.values(rep.descriptions ?? {}).find((d) => d && d !== 'NA') ?? null
    : null;

  const setTab = useCallback(
    (tab: TabId) => {
      setParams((prev) => {
        if (tab === 'members') prev.delete('tab');
        else prev.set('tab', tab);
        return prev;
      });
    },
    [setParams],
  );

  const setCluster = useCallback(
    (cluster: GeneCluster) => {
      setParams((prev) => {
        prev.set('cluster', cluster.id);
        prev.set('tab', 'graph');
        return prev;
      });
    },
    [setParams],
  );

  if (!ogId) {
    return <div className="py-20 text-center text-gray-500">No orthogroup specified.</div>;
  }

  const groupLabels = diffDoc?.groupLabels ?? [];

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link
          to={traitId ? `/explore?trait=${traitId}` : '/explore'}
          className="hover:text-green-700 hover:underline"
        >
          ← Explore
        </Link>
        {traitId && (
          <>
            <span>/</span>
            <span className="text-gray-400">{traitId.replace(/_/g, ' ')}</span>
          </>
        )}
        <span>/</span>
        <span className="text-gray-900 font-medium">{ogId}</span>
      </div>

      {/* Header */}
      <Card>
        <CardContent className="py-4 space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-900 font-mono">{ogId}</h1>
              {rep ? (
                <p className="text-sm text-gray-600 mt-0.5 truncate">
                  {primaryDesc ?? 'No functional description'}
                  <span className="text-gray-400 ml-2 text-xs">
                    ({rep.transcripts?.length ?? 0} linked IRGSP transcripts)
                  </span>
                </p>
              ) : (
                <p className="text-sm text-gray-400 mt-0.5">Non-IRGSP-linked orthogroup</p>
              )}
            </div>
            {traitId && (
              <span
                className="text-xs px-2 py-1 rounded border border-green-200 bg-green-50 text-green-700 shrink-0"
                title={
                  groupLabels.length === 2
                    ? `OG-level copy-count candidate: Mann-Whitney U on the OG copy count between '${groupLabels[0]}' and '${groupLabels[1]}'. Copy-count shift is at the orthogroup level, not resolved to a specific locus.`
                    : undefined
                }
              >
                OG-level CNV candidate · {traitId.replace(/_/g, ' ')}
                {diffEntry && (
                  <>
                    {' · '}
                    <span className="tabular-nums">
                      Δmean {diffEntry.meanDiff.toFixed(2)}
                    </span>
                  </>
                )}
              </span>
            )}
          </div>

          {/* Anchor cluster + group stats */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 pt-1">
            {diffEntry && (
              <span className="tabular-nums">
                Δmean <strong className="text-gray-900">{diffEntry.meanDiff.toFixed(2)}</strong>
                <span className="mx-1.5 text-gray-300">·</span>
                p <strong className="text-gray-900">{formatP(diffEntry.pValue)}</strong>
                {diffEntry.log2FoldChange !== null && (
                  <>
                    <span className="mx-1.5 text-gray-300">·</span>
                    log₂FC <strong className="text-gray-900">{diffEntry.log2FoldChange.toFixed(2)}</strong>
                  </>
                )}
              </span>
            )}
            {selectedCluster ? (
              <span className="font-mono text-[11px]">
                Anchor: <strong className="text-gray-900">{selectedCluster.cultivar}</strong>{' '}
                {formatClusterSummary(selectedCluster)}
              </span>
            ) : clusters.length === 0 && ogCoords ? (
              <span className="text-gray-400 italic">No gene clusters for this OG</span>
            ) : null}
            {tierMetrics && <OgAnchorTierBadge metrics={tierMetrics} />}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0 -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-green-600 text-green-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </nav>
      </div>

      <ScopeStrip>
        Orthogroup-level evidence. Anchor-locus variants are shown as
        locus-local evidence only, gated by anchor representativeness.
        Not causal, not marker-ready.
      </ScopeStrip>

      {/* Tab content */}
      {activeTab === 'members' && (
        <OgDetailGeneTab
          ogId={ogId}
          members={members}
          loading={membersLoading}
          cultivarNameMap={cultivarNameMap}
          groupByCultivar={groupByCultivar}
          groupColorMap={groupColorMap}
          diffDoc={diffDoc}
          representative={rep ?? null}
          afSummary={afSummary}
          onClusterSelect={setCluster}
          selectedClusterId={selectedCluster?.id ?? null}
        />
      )}
      {activeTab === 'af' && (
        <OgDetailAlleleFreqTab
          ogId={ogId}
          selectedCluster={selectedCluster}
          afSummary={afSummary}
          groupLabels={groupLabels}
          groupColorMap={groupColorMap}
          tierMetrics={tierMetrics}
        />
      )}
      {activeTab === 'graph' && (
        <OgDetailGraphTab
          ogId={ogId}
          selectedCluster={selectedCluster}
          clusters={clusters}
          onClusterSelect={setCluster}
          coords={ogCoords}
          groupByCultivar={groupByCultivar}
          groupColorMap={groupColorMap}
          groupLabels={groupLabels}
        />
      )}
    </div>
  );
}

function formatP(p: number): string {
  if (p < 1e-4) return p.toExponential(1);
  return p.toFixed(3);
}

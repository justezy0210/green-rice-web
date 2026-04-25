import { useCallback, useMemo, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { OgDetailAlleleFreqTab } from '@/components/og-detail/OgDetailAlleleFreqTab';
import { OgCoreShellBadge } from '@/components/og-detail/OgCoreShellBadge';
import { ClusterContextCard } from '@/components/og-detail/ClusterContextCard';
import { OgTraitHitChips } from '@/components/og-detail/OgTraitHitChips';
import { OgActiveRunCard } from '@/components/og-detail/OgActiveRunCard';
import { OgLeadSvCard } from '@/components/og-detail/OgLeadSvCard';
import { OgCultivarCopyMap } from '@/components/og-detail/OgCultivarCopyMap';
import { OgIntersectionsSection } from '@/components/og-detail/OgIntersectionsSection';
import { ScopeStrip } from '@/components/common/ScopeStrip';
import { ObservedInAnalysesPanel } from '@/components/entity/ObservedInAnalysesPanel';
import { CandidateBlocksInAnalysesPanel } from '@/components/entity/CandidateBlocksInAnalysesPanel';
import { useOrthogroupDiff } from '@/hooks/useOrthogroupDiff';
import { useOrthogroupDiffEntries } from '@/hooks/useOrthogroupDiffEntries';
import { useOgDrilldown } from '@/hooks/useOgDrilldown';
import { useOgAlleleFreq } from '@/hooks/useOgAlleleFreq';
import { useOgGeneCoords } from '@/hooks/useOgGeneCoords';
import { useCultivars } from '@/hooks/useCultivars';
import { useOgRegionManifest } from '@/hooks/useOgRegion';
import { useCandidate } from '@/hooks/useCandidates';
import { buildGroupColorMap } from '@/components/dashboard/distribution-helpers';
import { buildGeneClusters, buildReferenceCluster } from '@/lib/og-gene-clusters';
import { classifyAnchorTier } from '@/lib/og-anchor-tier';
import { classifyPavEvidence } from '@/lib/pav-evidence';
import { classifyCopyArchitecture } from '@/lib/og-copy-architecture';
import { isReferencePathCultivar } from '@/lib/irgsp-constants';
import type { TraitId } from '@/types/grouping';
import type { OrthogroupDiffEntry, GeneCluster } from '@/types/orthogroup';

const DEFAULT_INTERSECTION_RELEASE_ID = 'int_v1';

function runIdFor(traitId: string): string {
  return `${traitId}_g4_of6_sv1_gm11_sc1`;
}

export function OgDetailPage() {
  const { ogId } = useParams<{ ogId: string }>();
  const [params, setParams] = useSearchParams();
  const traitId = (params.get('trait') ?? null) as TraitId | null;
  const selectedClusterId = params.get('cluster');

  const runId = traitId ? runIdFor(traitId) : null;
  const { doc: diffDoc, groupingDoc } = useOrthogroupDiff(traitId);
  const entriesState = useOrthogroupDiffEntries(diffDoc);
  const alleleFreq = useOgAlleleFreq(
    traitId,
    diffDoc?.orthofinderVersion ?? null,
    diffDoc?.groupingVersion ?? null,
  );
  const version = diffDoc?.orthofinderVersion ?? null;
  const { members } = useOgDrilldown(ogId ?? null, version);
  const { data: ogCoords } = useOgGeneCoords(ogId ?? null);
  const { cultivars } = useCultivars();
  const { manifest } = useOgRegionManifest();
  const { candidate, loading: candidateLoading } = useCandidate(runId, ogId ?? null);

  const groupByCultivar = groupingDoc?.assignments ?? null;
  const groupLabels = diffDoc?.groupLabels ?? [];
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
  const primaryDesc = rep
    ? Object.values(rep.descriptions ?? {}).find((d) => d && d !== 'NA') ?? null
    : null;

  const clusters = useMemo(() => {
    const cultivarClusters = ogCoords ? buildGeneClusters(ogCoords) : [];
    const refCluster = buildReferenceCluster(rep ?? null, afSummary);
    return refCluster ? [refCluster, ...cultivarClusters] : cultivarClusters;
  }, [ogCoords, rep, afSummary]);

  const selectedCluster: GeneCluster | null = useMemo(() => {
    if (selectedClusterId) {
      const byId = clusters.find((c) => c.id === selectedClusterId);
      if (byId) return byId;
    }
    const firstCultivar = clusters.find((c) => c.source === 'cultivar');
    return firstCultivar ?? clusters[0] ?? null;
  }, [clusters, selectedClusterId]);

  const tierMetrics = useMemo(() => {
    if (!selectedCluster || selectedCluster.source === 'reference') return null;
    if (!ogCoords) return null;
    return classifyAnchorTier(selectedCluster, ogCoords);
  }, [selectedCluster, ogCoords]);

  const pavRows = useMemo(() => {
    if (!members || cultivars.length === 0) return [];
    return classifyPavEvidence(
      members,
      cultivars.map((c) => c.id),
    );
  }, [members, cultivars]);

  const architecture = useMemo(() => {
    if (!members || cultivars.length === 0) return null;
    const counts: Record<string, number> = {};
    for (const c of cultivars) {
      if (isReferencePathCultivar(c.id)) continue;
      counts[c.id] = members[c.id]?.length ?? 0;
    }
    return classifyCopyArchitecture(counts);
  }, [members, cultivars]);

  const bundleAvailableIds = useMemo(() => {
    if (!manifest || !ogId) return undefined;
    const ogEntry = manifest.ogs[ogId];
    if (!ogEntry?.clusters) return undefined;
    return new Set(ogEntry.clusters.map((c) => c.clusterId));
  }, [manifest, ogId]);

  const setCluster = useCallback(
    (cluster: GeneCluster) => {
      setParams((prev) => {
        prev.set('cluster', cluster.id);
        return prev;
      });
    },
    [setParams],
  );

  const [anchorExpanded, setAnchorExpanded] = useState(false);

  if (!ogId) {
    return <div className="py-20 text-center text-gray-500">No orthogroup specified.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        {traitId ? (
          <>
            <Link
              to={`/analysis/${runIdFor(traitId)}`}
              className="hover:text-green-700 hover:underline"
            >
              ← {traitId.replace(/_/g, ' ')} run
            </Link>
            <span>/</span>
            <span className="text-gray-400">OG</span>
          </>
        ) : (
          <Link to="/" className="hover:text-green-700 hover:underline">
            ← Overview
          </Link>
        )}
        <span>/</span>
        <span className="text-gray-900 font-medium">{ogId}</span>
      </div>

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
            <div className="flex flex-col items-end gap-1 shrink-0">
              {architecture && <OgCoreShellBadge architecture={architecture} />}
              {architecture && (
                <span className="text-[10px] text-gray-500" title="Panel-scoped copy-count distribution. Not validation-grade.">
                  {architecture.architectureLabel}
                </span>
              )}
            </div>
          </div>
          <div className="pt-1">
            <OgTraitHitChips ogId={ogId} activeTraitId={traitId} />
          </div>
        </CardContent>
      </Card>

      {runId && (
        <OgActiveRunCard
          runId={runId}
          candidate={candidate}
          loading={candidateLoading}
        />
      )}

      {candidate?.bestSv && (
        <OgLeadSvCard
          bestSv={candidate.bestSv}
          traitId={traitId}
          groupLabels={groupLabels}
          meansByGroup={candidate.meansByGroup}
          presenceByGroup={candidate.presenceByGroup}
        />
      )}

      <ScopeStrip>
        Orthogroup-level evidence. Anchor-locus variants are shown as
        locus-local evidence only, gated by anchor representativeness.
        Not causal, not marker-ready.
      </ScopeStrip>

      {members && pavRows.length > 0 && cultivars.length > 0 && (
        <OgCultivarCopyMap
          members={members}
          cultivars={cultivars}
          groupByCultivar={groupByCultivar}
          pavRows={pavRows}
        />
      )}

      <OgIntersectionsSection
        ogId={ogId}
        intersectionReleaseId={DEFAULT_INTERSECTION_RELEASE_ID}
      />

      <Card>
        <CardContent className="py-3">
          {/* raw: full-width section header acting as a disclosure toggle — Button primitive doesn't fit a flex-row title+caret layout. */}
          <button
            onClick={() => setAnchorExpanded((v) => !v)}
            className="flex items-center justify-between w-full text-left"
          >
            <h3 className="text-xs uppercase tracking-wide text-gray-500">
              Anchor-locus variants
            </h3>
            <span className="text-[11px] text-green-700">
              {anchorExpanded ? 'Hide' : 'Show'}
            </span>
          </button>
          {anchorExpanded && (
            <div className="mt-3 space-y-3">
              <ClusterContextCard
                clusters={clusters}
                selectedClusterId={selectedCluster?.id ?? null}
                onClusterSelect={setCluster}
                representative={rep ?? null}
                afSummary={afSummary}
                coords={ogCoords}
                groupByCultivar={groupByCultivar}
                groupLabels={groupLabels}
                bundleAvailableIds={bundleAvailableIds}
              />
              <OgDetailAlleleFreqTab
                ogId={ogId}
                selectedCluster={selectedCluster}
                clusters={clusters}
                onClusterSelect={setCluster}
                afSummary={afSummary}
                groupLabels={groupLabels}
                groupColorMap={groupColorMap}
                tierMetrics={tierMetrics}
                traitId={traitId}
                bundleAvailableIds={bundleAvailableIds}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <CandidateBlocksInAnalysesPanel entityType="og" entityId={ogId} />
      <ObservedInAnalysesPanel entityType="og" entityId={ogId} />
    </div>
  );
}

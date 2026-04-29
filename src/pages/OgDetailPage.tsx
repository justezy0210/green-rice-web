import { useMemo } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { OgCoreShellBadge } from '@/components/og-detail/OgCoreShellBadge';
import { OgTraitHitChips } from '@/components/og-detail/OgTraitHitChips';
import { OgLeadSvCard } from '@/components/og-detail/OgLeadSvCard';
import { OgMemberGenesTable } from '@/components/og-detail/OgMemberGenesTable';
import { CandidateBlocksInAnalysesPanel } from '@/components/entity/CandidateBlocksInAnalysesPanel';
import { useOrthogroupDiff } from '@/hooks/useOrthogroupDiff';
import { useOrthogroupDiffEntries } from '@/hooks/useOrthogroupDiffEntries';
import { useOgDrilldown } from '@/hooks/useOgDrilldown';
import { useCultivars } from '@/hooks/useCultivars';
import { useCandidate } from '@/hooks/useCandidates';
import { DEFAULT_TRAIT_ID } from '@/config/traits';
import { classifyPavEvidence } from '@/lib/pav-evidence';
import { classifyCopyArchitecture } from '@/lib/og-copy-architecture';
import { isReferencePathCultivar } from '@/lib/irgsp-constants';
import type { TraitId } from '@/types/grouping';
import type { OrthogroupDiffEntry } from '@/types/orthogroup';

function runIdFor(traitId: string): string {
  return `${traitId}_g4_of6_sv1_gm11_sc1`;
}

export function OgDetailPage() {
  const { ogId } = useParams<{ ogId: string }>();
  const [params] = useSearchParams();
  const traitId = (params.get('trait') ?? null) as TraitId | null;

  const runId = traitId ? runIdFor(traitId) : null;
  const { doc: diffDoc, groupingDoc } = useOrthogroupDiff(traitId);
  const { doc: defaultDiffDoc } = useOrthogroupDiff(traitId ? null : DEFAULT_TRAIT_ID);
  const entriesState = useOrthogroupDiffEntries(diffDoc);
  const version = diffDoc?.orthofinderVersion ?? defaultDiffDoc?.orthofinderVersion ?? null;
  const { members, loading: membersLoading, error: membersError } = useOgDrilldown(ogId ?? null, version);
  const { cultivars } = useCultivars();
  const { candidate } = useCandidate(runId, ogId ?? null);

  const groupByCultivar = groupingDoc?.assignments ?? null;
  const groupLabels = diffDoc?.groupLabels ?? [];

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

  const rep = diffEntry?.representative;
  const primaryDesc = rep
    ? Object.values(rep.descriptions ?? {}).find((d) => d && d !== 'NA') ?? null
    : null;

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

  if (!ogId) {
    return <div className="py-20 text-center text-gray-500">No orthogroup specified.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        {traitId ? (
          <>
            <Link
              to="/discovery"
              className="hover:text-green-700 hover:underline"
            >
              ← Discovery
            </Link>
            <span>/</span>
            <span className="text-gray-400">OG</span>
          </>
        ) : (
          <Link to="/og" className="hover:text-green-700 hover:underline">
            ← Orthogroups
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

      {members ? (
        <OgMemberGenesTable
          members={members}
          cultivars={cultivars}
          groupByCultivar={groupByCultivar}
          activeTraitId={traitId}
          pavRows={pavRows}
        />
      ) : membersLoading ? (
        <Card>
          <CardContent className="py-4 text-sm text-gray-400">
            Loading orthogroup member genes...
          </CardContent>
        </Card>
      ) : membersError ? (
        <Card>
          <CardContent className="py-4 text-sm text-red-500">{membersError}</CardContent>
        </Card>
      ) : null}

      {candidate?.bestSv && (
        <OgLeadSvCard
          bestSv={candidate.bestSv}
          traitId={traitId}
          groupLabels={groupLabels}
          meansByGroup={candidate.meansByGroup}
          presenceByGroup={candidate.presenceByGroup}
        />
      )}

      <CandidateBlocksInAnalysesPanel entityType="og" entityId={ogId} />
    </div>
  );
}

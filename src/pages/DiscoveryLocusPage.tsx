import { useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { DiscoveryLocusSummaryCard } from '@/components/discovery/DiscoveryLocusSummaryCard';
import { LocusCaveatStrip } from '@/components/discovery/LocusCaveatStrip';
import { LocusEvidenceMatrix } from '@/components/discovery/LocusEvidenceMatrix';
import { LocusTraitFilterBar } from '@/components/discovery/LocusTraitFilterBar';
import { SvPatternByGroup } from '@/components/discovery/SvPatternByGroup';
import { useAnalysisRuns } from '@/hooks/useAnalysisRuns';
import { useDiscoveryBlocks } from '@/hooks/useDiscoveryBlocks';
import { useDiscoveryLocusCandidates } from '@/hooks/useDiscoveryLocusCandidates';
import { groupDiscoveryBlocks } from '@/lib/discovery-block-groups';
import {
  displayNameForDiscoveryBlockGroup,
  resolveDiscoveryLocusSlug,
} from '@/lib/discovery-locus-slugs';
import { selectRepresentativeDiscoveryRuns } from '@/lib/discovery-runs';
import type { TraitId } from '@/types/traits';

export function DiscoveryLocusPage() {
  const { locusSlug } = useParams<{ locusSlug: string }>();
  const [selectedTraitId, setSelectedTraitId] = useState<TraitId | null>(null);
  const { runs, loading: runsLoading, error: runsError } = useAnalysisRuns();
  const representativeRuns = useMemo(
    () => selectRepresentativeDiscoveryRuns(runs),
    [runs],
  );
  const {
    blocks,
    loading: blocksLoading,
    error: blocksError,
  } = useDiscoveryBlocks(representativeRuns);
  const groups = useMemo(() => groupDiscoveryBlocks(blocks), [blocks]);
  const group = useMemo(
    () => resolveDiscoveryLocusSlug(locusSlug, groups),
    [locusSlug, groups],
  );
  const {
    candidates,
    loading: candidatesLoading,
    error: candidatesError,
  } = useDiscoveryLocusCandidates(group?.blocks);

  if (runsLoading || blocksLoading) {
    return <MessageCard tone="muted">Loading discovery locus...</MessageCard>;
  }

  const error = runsError ?? blocksError;
  if (error) {
    return <MessageCard tone="error">{error.message}</MessageCard>;
  }

  if (!group) {
    return (
      <MessageCard tone="muted">
        Discovery locus not found. <Link to="/discovery" className="text-green-700 hover:underline">Back to Discovery</Link>
      </MessageCard>
    );
  }

  const title = displayNameForDiscoveryBlockGroup(group);
  const activeTraitId =
    selectedTraitId && group.traitIds.includes(selectedTraitId) ? selectedTraitId : null;
  const filteredBlocks = activeTraitId
    ? group.blocks.filter((block) => block.traitId === activeTraitId)
    : group.blocks;
  const filteredCandidates = activeTraitId
    ? candidates.filter((candidate) => candidate.traitId === activeTraitId)
    : candidates;
  const toggleTraitFilter = (traitId: TraitId) => {
    setSelectedTraitId((current) => (current === traitId ? null : traitId));
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-500">
        <Link to="/discovery" className="hover:text-green-700 hover:underline">
          Discovery
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{title}</span>
      </div>

      <DiscoveryLocusSummaryCard
        group={group}
        title={title}
      />

      <LocusCaveatStrip />

      <LocusTraitFilterBar
        group={group}
        selectedTraitId={activeTraitId}
        onSelectTrait={toggleTraitFilter}
        onClear={() => setSelectedTraitId(null)}
      />

      <SvPatternByGroup
        candidates={filteredCandidates}
        blocks={filteredBlocks}
        candidatesLoading={candidatesLoading}
        candidatesError={candidatesError}
      />

      <Card>
        <CardContent className="space-y-3 py-4">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <h2 className="text-xs uppercase tracking-wide text-gray-500">
                Supporting trait evidence
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Trait comparisons that brought this locus into review.
              </p>
            </div>
            {activeTraitId && (
              <button
                type="button"
                className="rounded border border-green-200 bg-green-50 px-2 py-1 text-[10px] font-medium text-green-800 hover:bg-green-100"
                onClick={() => setSelectedTraitId(null)}
              >
                Clear trait filter
              </button>
            )}
          </div>
          <LocusEvidenceMatrix
            group={group}
            selectedTraitId={activeTraitId}
            onSelectTrait={toggleTraitFilter}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function MessageCard({
  children,
  tone,
}: {
  children: ReactNode;
  tone: 'muted' | 'error';
}) {
  return (
    <Card>
      <CardContent
        className={`py-6 text-sm ${tone === 'error' ? 'text-red-500' : 'text-gray-500'}`}
      >
        {children}
      </CardContent>
    </Card>
  );
}

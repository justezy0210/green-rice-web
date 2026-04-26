import { useMemo, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { BlockExportPanel } from '@/components/discovery/BlockExportPanel';
import { DiscoveryLocusSummaryCard } from '@/components/discovery/DiscoveryLocusSummaryCard';
import { LocusCandidateTable } from '@/components/discovery/LocusCandidateTable';
import { LocusCaveatStrip } from '@/components/discovery/LocusCaveatStrip';
import { LocusCuratorNotes } from '@/components/discovery/LocusCuratorNotes';
import { LocusEvidenceMatrix } from '@/components/discovery/LocusEvidenceMatrix';
import { useAnalysisRuns } from '@/hooks/useAnalysisRuns';
import { useDiscoveryBlocks } from '@/hooks/useDiscoveryBlocks';
import { useDiscoveryLocusCandidates } from '@/hooks/useDiscoveryLocusCandidates';
import { groupDiscoveryBlocks } from '@/lib/discovery-block-groups';
import {
  displayNameForDiscoveryBlockGroup,
  resolveDiscoveryLocusSlug,
} from '@/lib/discovery-locus-slugs';
import { selectRepresentativeDiscoveryRuns } from '@/lib/discovery-runs';

export function DiscoveryLocusPage() {
  const { locusSlug } = useParams<{ locusSlug: string }>();
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
  const block = group?.representative ?? null;
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

  if (!group || !block) {
    return (
      <MessageCard tone="muted">
        Discovery locus not found. <Link to="/discovery" className="text-green-700 hover:underline">Back to Discovery</Link>
      </MessageCard>
    );
  }

  const title = displayNameForDiscoveryBlockGroup(group);
  const representativeCandidates = candidates.filter(
    (candidate) => candidate.runId === block.runId && candidate.blockId === block.blockId,
  );
  const exactBlockUrl = `/discovery/${block.runId}/block/${encodeURIComponent(block.blockId)}`;

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
        exactBlockUrl={exactBlockUrl}
        candidates={candidates}
        candidatesLoading={candidatesLoading}
      />

      <LocusCaveatStrip />

      <Card>
        <CardContent className="py-4">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h2 className="text-xs uppercase tracking-wide text-gray-500">
              Priority leads
            </h2>
            <span className="text-[10px] text-gray-400">
              start with OG, gene, or region links
            </span>
          </div>
          <LocusCandidateTable
            candidates={candidates}
            blocks={group.blocks}
            loading={candidatesLoading}
            error={candidatesError}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 py-4">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-xs uppercase tracking-wide text-gray-500">
              Trait comparison
            </h2>
            <span className="text-[10px] text-gray-400">
              source block per trait; representative highlighted
            </span>
          </div>
          <LocusEvidenceMatrix group={group} />
        </CardContent>
      </Card>

      <LocusCuratorNotes block={block} />

      <BlockExportPanel
        block={block}
        candidates={representativeCandidates}
        title="Representative block export"
        description="Block-scoped candidate-discovery export for the representative row in this locus. The locus table above may include candidates from additional trait blocks."
      />
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

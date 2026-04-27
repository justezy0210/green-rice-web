import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  FallbackLocusList,
  LocusReviewTable,
} from '@/components/discovery/LocusTraitMatrixRows';
import {
  groupDiscoveryBlocks,
  type DiscoveryBlockGroup,
} from '@/lib/discovery-block-groups';
import {
  summarizeDiscoveryLocusReview,
  type DiscoveryLocusReviewSummary,
} from '@/lib/discovery-locus-review-summary';
import { SV_RELEASE_ID } from '@/lib/releases';
import { useDiscoveryLocusCandidates } from '@/hooks/useDiscoveryLocusCandidates';
import { useLocusSvGroupFreq } from '@/hooks/useLocusSvGroupFreq';
import type { AnalysisRun } from '@/types/analysis-run';
import type { Candidate } from '@/types/candidate';
import type { CandidateBlock } from '@/types/candidate-block';

interface Props {
  blocks: CandidateBlock[];
  runs: AnalysisRun[];
  loading: boolean;
  error: Error | null;
  traitLabel: (traitId: string) => string;
}

export function LocusTraitMatrix({ blocks, runs, loading, error, traitLabel }: Props) {
  const allGroups = useMemo(() => groupDiscoveryBlocks(blocks), [blocks]);
  const traitIds = useMemo(
    () => Array.from(new Set(blocks.map((block) => block.traitId))).sort(),
    [blocks],
  );
  const traitOrder = useMemo(
    () => new Map(runs.map((run, index) => [run.traitId, index])),
    [runs],
  );
  const { byTrait, loading: reviewLoading, error: reviewError } = useLocusSvGroupFreq(
    SV_RELEASE_ID,
    traitIds,
  );
  const {
    candidates,
    loading: candidatesLoading,
    error: candidatesError,
  } = useDiscoveryLocusCandidates(blocks);
  const candidatesByBlock = useMemo(() => groupCandidatesByBlock(candidates), [candidates]);
  const summaries = useMemo(
    () =>
      new Map(
        allGroups.map((group) => [
          group.key,
          summarizeDiscoveryLocusReview(group, byTrait, candidatesForGroup(group, candidatesByBlock)),
        ]),
      ),
    [allGroups, byTrait, candidatesByBlock],
  );
  const groups = useMemo(
    () =>
      sortReviewGroups(
        allGroups.filter(
          (group) => (summaries.get(group.key)?.prioritizedPatternCount ?? 0) > 0,
        ),
        summaries,
      ).slice(0, 8),
    [allGroups, summaries],
  );
  const fallbackGroups = useMemo(
    () => sortReviewGroups(allGroups, summaries).slice(0, 8),
    [allGroups, summaries],
  );
  const summaryLoading = reviewLoading || candidatesLoading;
  const summaryError = reviewError ?? candidatesError;

  return (
    <Card>
      <CardContent className="py-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-xs uppercase tracking-wide text-gray-500">
            Priority review loci
          </h2>
          <span className="text-[10px] text-gray-400">
            loci ranked by selected SVs to review
          </span>
        </div>
        {loading ? (
          <p className="text-sm text-gray-400">Loading review loci...</p>
        ) : error ? (
          <p className="text-sm text-red-500">{error.message}</p>
        ) : allGroups.length === 0 ? (
          <p className="text-sm text-gray-500">
            No review loci are materialized for the current representative runs.
          </p>
        ) : summaryLoading ? (
          <p className="text-sm text-gray-400">Selecting SVs to review...</p>
        ) : summaryError ? (
          <p className="text-sm text-red-500">{summaryError.message}</p>
        ) : groups.length === 0 ? (
          <FallbackLocusList
            groups={fallbackGroups}
            summaries={summaries}
            traitLabel={traitLabel}
            traitOrder={traitOrder}
          />
        ) : (
          <LocusReviewTable
            groups={groups}
            summaries={summaries}
            summaryLoading={summaryLoading}
            traitLabel={traitLabel}
            traitOrder={traitOrder}
          />
        )}
      </CardContent>
    </Card>
  );
}

function sortReviewGroups(
  groups: DiscoveryBlockGroup[],
  summaries: Map<string, DiscoveryLocusReviewSummary>,
): DiscoveryBlockGroup[] {
  return [...groups].sort((a, b) => {
    const aSummary = summaries.get(a.key);
    const bSummary = summaries.get(b.key);
    const patternDelta =
      (bSummary?.prioritizedPatternCount ?? 0) - (aSummary?.prioritizedPatternCount ?? 0);
    if (patternDelta !== 0) return patternDelta;
    if (a.curated !== b.curated) return a.curated ? -1 : 1;
    const scoreDelta =
      (bSummary?.bestPattern?.score ?? -1) - (aSummary?.bestPattern?.score ?? -1);
    if (scoreDelta !== 0) return scoreDelta;
    if (b.traitIds.length !== a.traitIds.length) return b.traitIds.length - a.traitIds.length;
    return a.region.start - b.region.start;
  });
}

function groupCandidatesByBlock(candidates: Candidate[]): Map<string, Candidate[]> {
  const byBlock = new Map<string, Candidate[]>();
  for (const candidate of candidates) {
    const key = `${candidate.runId}:${candidate.blockId ?? ''}`;
    byBlock.set(key, [...(byBlock.get(key) ?? []), candidate]);
  }
  return byBlock;
}

function candidatesForGroup(
  group: DiscoveryBlockGroup,
  candidatesByBlock: Map<string, Candidate[]>,
): Candidate[] {
  return group.blocks.flatMap(
    (block) => candidatesByBlock.get(`${block.runId}:${block.blockId}`) ?? [],
  );
}

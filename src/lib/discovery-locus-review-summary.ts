import type { DiscoveryBlockGroup } from '@/lib/discovery-block-groups';
import {
  buildSvPatternRows,
  collectLeadSvSources,
  isHighPrioritySvPattern,
  type SvPatternFreqByTrait,
  type SvPatternRow,
} from '@/lib/discovery-sv-pattern';
import type { Candidate } from '@/types/candidate';

export interface DiscoveryLocusReviewSummary {
  allSignalCount: number;
  prioritizedPatternCount: number;
  uniquePrioritizedSvCount: number;
  bestPattern: SvPatternRow | null;
  primaryOgId: string | null;
  primaryGeneId: string | null;
}

export function summarizeDiscoveryLocusReview(
  group: DiscoveryBlockGroup,
  byTrait: SvPatternFreqByTrait,
  candidates: Candidate[] = [],
): DiscoveryLocusReviewSummary {
  const sources = collectLeadSvSources(candidates, group.blocks);
  const allRows = buildSvPatternRows(sources, byTrait);
  const prioritizedRows = allRows.filter(isHighPrioritySvPattern);
  const bestPattern = prioritizedRows[0] ?? null;

  return {
    allSignalCount: allRows.length,
    prioritizedPatternCount: prioritizedRows.length,
    uniquePrioritizedSvCount: new Set(prioritizedRows.map((row) => row.eventId)).size,
    bestPattern,
    primaryOgId: pickPrimaryOgId(group, bestPattern),
    primaryGeneId: bestPattern?.geneId ?? null,
  };
}

function pickPrimaryOgId(
  group: DiscoveryBlockGroup,
  bestPattern: SvPatternRow | null,
): string | null {
  const bestBlock = bestPattern?.block;
  return (
    bestBlock?.leadOgs[0]?.ogId ??
    bestBlock?.topOgIds[0] ??
    group.representative.leadOgs[0]?.ogId ??
    group.representative.topOgIds[0] ??
    null
  );
}

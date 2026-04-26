import type { CandidateBlock, BlockRegion } from '@/types/candidate-block';

export interface DiscoveryBlockGroup {
  key: string;
  label: string;
  blockId: string;
  representative: CandidateBlock;
  blocks: CandidateBlock[];
  traitIds: string[];
  curated: boolean;
  region: BlockRegion;
  candidateOgTotal: number;
  intersectionTotal: number;
  maxCandidateOgCount: number;
  maxIntersectionCount: number;
}

export function groupDiscoveryBlocks(blocks: CandidateBlock[]): DiscoveryBlockGroup[] {
  const grouped = new Map<string, CandidateBlock[]>();
  for (const block of blocks) {
    const key = block.curated
      ? block.blockId
      : `${block.region.chr}:${block.region.start}-${block.region.end}`;
    grouped.set(key, [...(grouped.get(key) ?? []), block]);
  }

  return Array.from(grouped.entries())
    .map(([key, groupBlocks]) => buildGroup(key, groupBlocks))
    .sort(sortDiscoveryBlockGroups);
}

export function sortDiscoveryBlockGroups(
  a: DiscoveryBlockGroup,
  b: DiscoveryBlockGroup,
): number {
  if (a.curated !== b.curated) return a.curated ? -1 : 1;
  if (b.blocks.length !== a.blocks.length) return b.blocks.length - a.blocks.length;
  if (b.candidateOgTotal !== a.candidateOgTotal) {
    return b.candidateOgTotal - a.candidateOgTotal;
  }
  if (a.region.chr !== b.region.chr) return a.region.chr.localeCompare(b.region.chr);
  return a.region.start - b.region.start;
}

export function formatBlockRegion(region: BlockRegion): string {
  const start = region.start / 1_000_000;
  const end = region.end / 1_000_000;
  const startText = Number.isInteger(start) ? start.toFixed(0) : start.toFixed(1);
  const endText = Number.isInteger(end) ? end.toFixed(0) : end.toFixed(1);
  return `${region.chr}:${startText}-${endText} Mb`;
}

function buildGroup(key: string, blocks: CandidateBlock[]): DiscoveryBlockGroup {
  const representative = [...blocks].sort((a, b) => {
    if (a.curated !== b.curated) return a.curated ? -1 : 1;
    if (b.candidateOgCount !== a.candidateOgCount) {
      return b.candidateOgCount - a.candidateOgCount;
    }
    return b.intersectionCount - a.intersectionCount;
  })[0];
  const traitIds = Array.from(new Set(blocks.map((block) => block.traitId))).sort();
  const candidateOgTotal = blocks.reduce((sum, block) => sum + block.candidateOgCount, 0);
  const intersectionTotal = blocks.reduce((sum, block) => sum + block.intersectionCount, 0);

  return {
    key,
    label: labelForBlock(representative),
    blockId: representative.blockId,
    representative,
    blocks,
    traitIds,
    curated: blocks.some((block) => block.curated),
    region: representative.region,
    candidateOgTotal,
    intersectionTotal,
    maxCandidateOgCount: Math.max(...blocks.map((block) => block.candidateOgCount)),
    maxIntersectionCount: Math.max(...blocks.map((block) => block.intersectionCount)),
  };
}

function labelForBlock(block: CandidateBlock): string {
  const title = block.summaryMarkdown?.match(/^#\s+(.+)$/m)?.[1];
  if (title) return title.replaceAll('_', ' ');
  if (block.curationNote) return block.curationNote.replace(/\.$/, '');
  return block.blockId.replaceAll('_', ' ');
}

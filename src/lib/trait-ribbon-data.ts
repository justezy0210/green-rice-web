import type { CandidateBlock } from '@/types/candidate-block';

interface TraitCellData {
  minP: number | null;
  count: number;
}

/**
 * Aggregate CandidateBlocks into TraitRibbon cell data. For a given
 * set of blocks (usually coordinate-overlapping with a region, or
 * siblings of a curated block), emit one cell per trait with the
 * count of overlapping blocks and — where available — the block-level
 * best p-value.
 *
 * Block docs don't currently carry a p-value field; when that
 * lands, route it into `minP`. For now `minP` stays null and the
 * ribbon's tone falls back to "count>0 active / 0 muted" via the
 * callers' own color choice.
 */
export function buildTraitCellsFromBlocks(
  blocks: CandidateBlock[],
): Record<string, TraitCellData> {
  const cells: Record<string, TraitCellData> = {};
  for (const b of blocks) {
    const slot = cells[b.traitId] ?? { minP: null, count: 0 };
    slot.count += 1;
    cells[b.traitId] = slot;
  }
  return cells;
}

/**
 * Pick a representative block per trait (first curated if any, else
 * first by start) for use by the TraitRibbon `linkFor` resolver.
 */
export function representativeBlockPerTrait(
  blocks: CandidateBlock[],
): Record<string, CandidateBlock> {
  const result: Record<string, CandidateBlock> = {};
  for (const b of blocks) {
    const existing = result[b.traitId];
    if (!existing) {
      result[b.traitId] = b;
      continue;
    }
    if (b.curated && !existing.curated) {
      result[b.traitId] = b;
      continue;
    }
    if (b.curated === existing.curated && b.region.start < existing.region.start) {
      result[b.traitId] = b;
    }
  }
  return result;
}

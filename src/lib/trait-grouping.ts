import groupingJson from '../../data/analysis_groupings_v4.json';
import type { TraitId } from '@/types/traits';

export interface TraitGroupAssignment {
  groupLabel: string;
  borderline: boolean;
}

interface GroupingTrait {
  assignments?: Record<string, TraitGroupAssignment>;
}

const groupingTraits = (groupingJson as {
  traits?: Partial<Record<TraitId, GroupingTrait>>;
}).traits ?? {};

export function traitGroupForCultivar(
  traitId: TraitId | null | undefined,
  cultivar: string | null | undefined,
): TraitGroupAssignment | null {
  if (!traitId || !cultivar) return null;
  return groupingTraits[traitId]?.assignments?.[cultivar] ?? null;
}

/**
 * Trait registry for UI-facing display data (labels + order).
 *
 * Loads from data/traits.json — the cross-language SSOT shared with
 * functions-python/shared/traits.py. The canonical `TraitId` union lives
 * in src/types/traits.ts; scripts/check-traits-schema.ts asserts that
 * the JSON id set matches the union.
 */

import traitsJson from '../../data/traits.json';
import type { TraitId } from '@/types/traits';

export interface TraitDef {
  id: TraitId;
  label: string;
}

const RAW_ENTRIES = (traitsJson.traits ?? []) as ReadonlyArray<{
  id: string;
  label: string;
}>;

export const TRAITS: readonly TraitDef[] = RAW_ENTRIES.map((e) => ({
  id: e.id as TraitId,
  label: e.label,
}));

export const DEFAULT_TRAIT_ID: TraitId = 'heading_date';

const TRAIT_IDS_SET = new Set<string>(TRAITS.map((t) => t.id));

export function isTraitId(v: string | null | undefined): v is TraitId {
  return typeof v === 'string' && TRAIT_IDS_SET.has(v);
}

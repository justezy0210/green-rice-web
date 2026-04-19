/**
 * Single source of truth for the trait registry consumed by:
 *  - route parsing / default trait
 *  - TraitSelector UI options
 *  - TraitQualityOverview display order + label
 *  - dashboard panel counters
 *
 * The `TraitId` union is derived from this array so a new trait added here
 * propagates everywhere type-checked callers use `TraitId`.
 */

export interface TraitDef {
  id: string;
  label: string;
}

export const TRAITS = [
  { id: 'heading_date', label: 'Days to Heading' },
  { id: 'culm_length', label: 'Culm Length' },
  { id: 'panicle_length', label: 'Panicle Length' },
  { id: 'panicle_number', label: 'Panicle Number' },
  { id: 'spikelets_per_panicle', label: 'Spikelets / Panicle' },
  { id: 'ripening_rate', label: 'Ripening Rate' },
  { id: 'grain_weight', label: '1000-Grain Weight' },
  { id: 'pre_harvest_sprouting', label: 'Pre-harvest Sprouting' },
  { id: 'bacterial_leaf_blight', label: 'Bacterial Leaf Blight' },
] as const satisfies readonly TraitDef[];

export type TraitId = (typeof TRAITS)[number]['id'];

export const TRAIT_IDS: readonly TraitId[] = TRAITS.map((t) => t.id);
export const DEFAULT_TRAIT_ID: TraitId = 'heading_date';

const TRAIT_BY_ID = new Map<string, TraitDef>(TRAITS.map((t) => [t.id, t]));

export function isTraitId(v: string | null | undefined): v is TraitId {
  return typeof v === 'string' && TRAIT_BY_ID.has(v);
}

export function traitLabel(id: TraitId): string {
  return TRAIT_BY_ID.get(id)?.label ?? id;
}

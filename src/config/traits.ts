/**
 * Trait registry for UI-facing display data (labels + order).
 *
 * The canonical `TraitId` union lives in `src/types/traits.ts`. Every entry
 * here is checked against that union via `satisfies`, so adding or renaming
 * a trait is caught at compile time if either side drifts.
 */

import type { TraitId } from '@/types/traits';

export interface TraitDef {
  id: TraitId;
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

export const DEFAULT_TRAIT_ID: TraitId = 'heading_date';

const TRAIT_IDS_SET = new Set<string>(TRAITS.map((t) => t.id));

export function isTraitId(v: string | null | undefined): v is TraitId {
  return typeof v === 'string' && TRAIT_IDS_SET.has(v);
}

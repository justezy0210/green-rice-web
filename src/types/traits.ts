/**
 * Canonical trait identifier union.
 *
 * Owned by the types layer so lib / hooks / components / pages can narrow on
 * it without importing from the `config/` runtime module. The companion
 * registry (`src/config/traits.ts`) attaches display labels and is checked
 * against this union via `satisfies`.
 */

export type TraitId =
  | 'heading_date'
  | 'culm_length'
  | 'panicle_length'
  | 'panicle_number'
  | 'spikelets_per_panicle'
  | 'ripening_rate'
  | 'grain_weight'
  | 'pre_harvest_sprouting'
  | 'bacterial_leaf_blight';

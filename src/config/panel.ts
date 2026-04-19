/**
 * Panel metadata — single source for "what data this DB covers", derived from
 * `data/cultivars.json` (shared with the Python side via scripts/_cultivars.py).
 *
 * Any UI copy that mentions panel size, pangenome coverage, trait count, or
 * reference genome should read from here instead of inlining numbers.
 */

import cultivarsJson from '../../data/cultivars.json';
import { IRGSP_DISPLAY_NAME } from '@/lib/irgsp-constants';
import { TRAITS } from './traits';

interface CultivarEntry {
  id: string;
  pangenome?: boolean;
}

const ENTRIES: readonly CultivarEntry[] = (cultivarsJson.cultivars ?? []) as CultivarEntry[];

export const ALL_CULTIVAR_IDS: readonly string[] = ENTRIES.map((c) => c.id);
export const PANGENOME_CULTIVAR_IDS: readonly string[] = ENTRIES.filter((c) => c.pangenome).map(
  (c) => c.id,
);

export const TOTAL_CULTIVARS = ALL_CULTIVAR_IDS.length;
export const PANGENOME_CULTIVAR_COUNT = PANGENOME_CULTIVAR_IDS.length;
export const TRAIT_COUNT = TRAITS.length;

export const REFERENCE_DISPLAY_NAME = IRGSP_DISPLAY_NAME;
export const REFERENCE_SHORT_NAME = `${IRGSP_DISPLAY_NAME} reference`;

/** "16 cultivars", "11 of 16 aligned", etc. are built from these. */
export const PANEL_LABEL = {
  panelSize: `${TOTAL_CULTIVARS}-cultivar`,
  panelSizeFull: `${TOTAL_CULTIVARS} cultivars`,
  coverageFraction: `${PANGENOME_CULTIVAR_COUNT}/${TOTAL_CULTIVARS}`,
  coverageOf: `${PANGENOME_CULTIVAR_COUNT} of ${TOTAL_CULTIVARS}`,
  coverageCompact: `${PANGENOME_CULTIVAR_COUNT}/${TOTAL_CULTIVARS}`,
} as const;

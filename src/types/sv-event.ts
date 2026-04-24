import type { TraitId } from '@/types/traits';

export type SvType = 'INS' | 'DEL' | 'COMPLEX';

export interface SvEvent {
  eventId: string;
  chr: string;
  pos: number;
  refLen: number;
  altLen: number;
  svLen: number;
  svLenAbs: number;
  svType: SvType;
  parentSnarl: string | null;
  originalId: string;
  /**
   * cultivarId → allele code as emitted by `vg deconstruct` on a
   * top-level snarl: a single ALT-allele index ("0" for REF, "1",
   * "2", … for ALT1/ALT2, "." for missing). Not a diploid VCF GT
   * string — the pangenome matrix stores haploid samples, so slashes
   * never appear here. Downstream consumers that infer presence
   * should treat any non-"0" non-"." value as ALT-carrying.
   */
  gts: Record<string, string>;
}

export interface SvChrBundle {
  schemaVersion: number;
  svReleaseId: string;
  chr: string;
  samples: string[];
  count: number;
  events: SvEvent[];
}

export interface SvGroupFreq {
  alt: number;
  total: number;
  freq: number;
}

export interface SvEventGroupFreq {
  eventId: string;
  byGroup: Record<string, SvGroupFreq>;
}

export interface SvTraitGroupFreqBundle {
  schemaVersion: number;
  svReleaseId: string;
  traitId: TraitId;
  groupingVersion: number;
  groupLabels: string[];
  count: number;
  byEvent: SvEventGroupFreq[];
}

export interface SvManifest {
  schemaVersion: number;
  svReleaseId: string;
  sourceVcf: string;
  samples: string[];
  sampleCount: number;
  normalizationMethod: string;
  eventCount: number;
  typeCounts: Record<SvType, number>;
  chrCounts: Record<string, number>;
  traitsWithGroupFreq: string[];
  builtAt: string;
}

/**
 * Sample-frame coordinate entry for a canonical SV event, used for
 * per-cultivar overlays that cannot tolerate reference-frame drift
 * (Gene detail SV overlay). `eventId` joins back to canonical
 * `SvEvent.eventId`; `pos` and `refLen` are expressed in the named
 * cultivar's own assembly coordinates.
 */
export interface SvCultivarCoord {
  eventId: string;
  chr: string;
  pos: number;
  refLen: number;
}

export interface SvCultivarCoordBundle {
  schemaVersion: number;
  svReleaseId: string;
  cultivar: string;
  chr: string;
  count: number;
  entries: SvCultivarCoord[];
}

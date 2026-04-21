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
  /** cultivarId → VCF GT string ("0/0", "0/1", "1/1", "./." …). */
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

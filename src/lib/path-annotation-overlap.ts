/**
 * Map a pangenome path (Cactus/vg-derived) to an annotation state: does the
 * cultivar have an OG member annotated at the path's displayed region?
 *
 * Strict scope:
 *  - Operates only on cultivar GFF3 annotation — does NOT claim PAV.
 *  - "No annotation here" can be gene absence, annotation gap, fragmented
 *    gene model, or relocation. UI must caveat.
 */

import { isReferencePathCultivar } from '@/lib/irgsp-constants';
import type { OgGeneCoords } from '@/types/orthogroup';

export type PathAnnotationStatus =
  | { kind: 'ref' }
  | { kind: 'unknown' }
  | { kind: 'annotated_here'; geneIds: string[] }
  | {
      kind: 'elsewhere_same_chr';
      here: { chr: string; start: number; end: number };
      elsewhere: { chr: string; start: number; end: number; ids: string[] };
    }
  | {
      kind: 'elsewhere_other_chr';
      here: { chr: string; start: number; end: number };
      elsewhere: { chr: string; start: number; end: number; ids: string[] };
    }
  | { kind: 'no_annotation' };

export interface ParsedPath {
  cultivar: string;
  chr: string;
  blockStart: number;
  localStart: number;
  localEnd: number;
  absoluteStart: number;
  absoluteEnd: number;
  isRef: boolean;
}

/**
 * Path name formats from `vg paths` / `vg chunk` output:
 *   - IRGSP-1#0#chr02[10083653-10121119]                 (reference, no phase block)
 *   - baegilmi#0#chr06#76329[9668800-9689470]            (phase-blocked cultivar)
 * Bracket coordinates are **local to the phase block** — absolute coord in the
 * cultivar's chromosome is `blockStart + local`.
 */
export function parsePathCoords(name: string): ParsedPath | null {
  const m = name.match(/^([^#]+)#\d+#([^#[]+)(?:#(\d+))?\[(\d+)-(\d+)\]$/);
  if (!m) return null;
  const [, cultivar, chr, blockStr, startStr, endStr] = m;
  const blockStart = blockStr ? parseInt(blockStr, 10) : 0;
  const localStart = parseInt(startStr, 10);
  const localEnd = parseInt(endStr, 10);
  return {
    cultivar,
    chr,
    blockStart,
    localStart,
    localEnd,
    absoluteStart: blockStart + localStart,
    absoluteEnd: blockStart + localEnd,
    isRef: isReferencePathCultivar(cultivar),
  };
}

export function getPathAnnotationStatus(
  name: string,
  coords: OgGeneCoords | null,
): PathAnnotationStatus {
  const parsed = parsePathCoords(name);
  if (!parsed) return { kind: 'unknown' };
  if (parsed.isRef) return { kind: 'ref' };

  if (!coords) return { kind: 'unknown' };
  const genes = coords[parsed.cultivar];
  if (!genes || genes.length === 0) return { kind: 'no_annotation' };

  const here = {
    chr: parsed.chr,
    start: parsed.absoluteStart,
    end: parsed.absoluteEnd,
  };

  const overlapping = genes.filter(
    (g) => g.chr === parsed.chr && g.start <= parsed.absoluteEnd && g.end >= parsed.absoluteStart,
  );
  if (overlapping.length > 0) {
    return { kind: 'annotated_here', geneIds: overlapping.map((g) => g.id) };
  }

  const sameChrOther = genes.filter((g) => g.chr === parsed.chr);
  if (sameChrOther.length > 0) {
    return {
      kind: 'elsewhere_same_chr',
      here,
      elsewhere: {
        chr: sameChrOther[0].chr,
        start: Math.min(...sameChrOther.map((g) => g.start)),
        end: Math.max(...sameChrOther.map((g) => g.end)),
        ids: sameChrOther.map((g) => g.id),
      },
    };
  }

  // No gene on this chr — pick first gene on another chr for tooltip.
  const g = genes[0];
  return {
    kind: 'elsewhere_other_chr',
    here,
    elsewhere: {
      chr: g.chr,
      start: Math.min(...genes.map((x) => x.start)),
      end: Math.max(...genes.map((x) => x.end)),
      ids: genes.map((x) => x.id),
    },
  };
}

export interface AnnotationDisplay {
  badge: string; // single char / short
  label: string; // short inline text after path label
  tooltip: string; // full hover hint
  dim: boolean; // should the path be de-emphasized?
}

export function annotationDisplay(status: PathAnnotationStatus): AnnotationDisplay | null {
  switch (status.kind) {
    case 'ref':
    case 'unknown':
      return null;
    case 'annotated_here':
      return {
        badge: '✓',
        label: '',
        tooltip: `Annotated OG member(s) overlap this region: ${status.geneIds.join(', ')}.`,
        dim: false,
      };
    case 'elsewhere_same_chr': {
      const mb = (n: number) => (n / 1_000_000).toFixed(2);
      return {
        badge: '⊘',
        label: `elsewhere ${status.elsewhere.chr}:${mb(status.elsewhere.start)}M`,
        tooltip: `No annotated OG member overlaps the displayed region. The cultivar has an OG member elsewhere on ${status.elsewhere.chr} at ${status.elsewhere.start.toLocaleString()}-${status.elsewhere.end.toLocaleString()}. Annotation absence ≠ gene absence (possible annotation gap, fragmented model, or relocation).`,
        dim: true,
      };
    }
    case 'elsewhere_other_chr': {
      const mb = (n: number) => (n / 1_000_000).toFixed(2);
      return {
        badge: '⊘',
        label: `gene on ${status.elsewhere.chr}:${mb(status.elsewhere.start)}M`,
        tooltip: `No annotated OG member on ${status.here.chr} in this cultivar. OG member annotated on ${status.elsewhere.chr} at ${status.elsewhere.start.toLocaleString()}-${status.elsewhere.end.toLocaleString()} — the ${status.here.chr} path here is syntenic DNA only.`,
        dim: true,
      };
    }
    case 'no_annotation':
      return {
        badge: '—',
        label: 'no OG member in cultivar',
        tooltip: `No OG member annotated anywhere in this cultivar's GFF3. Could be a true absence, an annotation gap, or an orthogroup assignment issue.`,
        dim: true,
      };
  }
}

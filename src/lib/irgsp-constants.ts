/**
 * IRGSP reference identifiers.
 *
 * Loads from data/reference.json — cross-language SSOT shared with
 * functions-python/shared/reference.py.
 *
 * Two forms exist for historical reasons:
 *   - SAMPLE_ID (`IRGSP-1`)     : as returned by `vg paths -L` in the
 *                                 Cactus/GBZ path names. Path parsers must
 *                                 match this literal exactly.
 *   - DISPLAY_NAME (`IRGSP-1.0`): user-facing label for the reference genome.
 */

import referenceJson from '../../data/reference.json';

interface ReferenceManifest {
  sampleId: string;
  displayName: string;
  longName: string;
}

function loadReference(): ReferenceManifest {
  const ref = referenceJson as Partial<ReferenceManifest>;
  if (!ref.sampleId || !ref.displayName || !ref.longName) {
    throw new Error(
      'data/reference.json is missing required fields (sampleId, displayName, longName)',
    );
  }
  return ref as ReferenceManifest;
}

const REFERENCE = loadReference();

export const IRGSP_SAMPLE_ID = REFERENCE.sampleId;
export const IRGSP_DISPLAY_NAME = REFERENCE.displayName;
export const IRGSP_LONG_NAME = REFERENCE.longName;

/** Matches `IRGSP-1#...` in paths produced by `vg paths -L`. */
export function isReferencePathCultivar(cultivar: string): boolean {
  return cultivar === IRGSP_SAMPLE_ID;
}

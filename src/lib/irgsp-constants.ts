/**
 * IRGSP reference identifiers.
 *
 * Two forms appear for historical reasons:
 *   - SAMPLE_ID (`IRGSP-1`)     : as returned by `vg paths -L` in the
 *                                 Cactus/GBZ path names. Path parsers must
 *                                 match this literal exactly.
 *   - DISPLAY_NAME (`IRGSP-1.0`): user-facing label for the reference genome.
 *
 * The two strings are kept separate because the path parser is driven by an
 * upstream tool (vg) we don't control, while the display name follows the
 * canonical reference genome version. Centralising both here prevents the
 * literals from leaking across the codebase.
 */

export const IRGSP_SAMPLE_ID = 'IRGSP-1';
export const IRGSP_DISPLAY_NAME = 'IRGSP-1.0';

/** Matches `IRGSP-1#...` in paths produced by `vg paths -L`. */
export function isReferencePathCultivar(cultivar: string): boolean {
  return cultivar === IRGSP_SAMPLE_ID;
}

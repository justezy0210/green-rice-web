/**
 * Version-keyed release identifiers for server-side artefacts the
 * client fetches. Centralised here so swapping to a new release (new
 * VCF, re-run pangenome, etc.) only requires one edit instead of
 * hunting for magic strings across pages. If a release needs to be
 * chosen at runtime (without code deploy) we add a pointer
 * manifest here later.
 */

/** Current SV matrix release — `sv_matrix/{SV_RELEASE_ID}/…`. */
export const SV_RELEASE_ID = 'sv_v1';

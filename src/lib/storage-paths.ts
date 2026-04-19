/**
 * Firebase Storage path builders for per-OG / per-version artifacts.
 *
 * Read-side only. The write-side layout (Python pipeline scripts and the TS
 * upload scripts under `scripts/`) still composes these paths manually, so
 * any change here must be mirrored there by hand until a cross-language
 * manifest replaces both.
 */

export function ogGeneCoordsPath(chunkKey: string): string {
  return `og_gene_coords/chunk_${chunkKey}.json`;
}

export function ogTubeMapPath(ogId: string): string {
  return `og_tubemap/${ogId}.json`;
}

/** Legacy trait-baked per-cluster region JSON. Kept for dual-read
 * fallback during Release A of docs/exec-plans/active/2026-04-19-og-region-expansion.md.
 * Retired by Release B. */
export function ogRegionPath(ogId: string, clusterId: string): string {
  return `og_region/${ogId}/${clusterId}.json`;
}

/** Legacy top-level manifest (single trait, versionless). Dual-read only. */
export function ogRegionManifestPath(): string {
  return `og_region/_manifest.json`;
}

// ─────────────────────────────────────────────────────────────
// OG region v2 — trait-split, version-namespaced. See
// docs/exec-plans/active/2026-04-19-og-region-expansion.md for the
// locked contract.
// ─────────────────────────────────────────────────────────────

function _ofGTag(orthofinderVersion: number, groupingVersion: number): string {
  return `v${orthofinderVersion}_g${groupingVersion}`;
}

/** Runtime pointer the UI reads first. Mirrors downloads/_manifest.json. */
export function ogRegionPointerPath(): string {
  return `downloads/_og_region_manifest.json`;
}

/** Trait-neutral graph bundle: anchor + liftover + graph body. */
export function ogRegionGraphPath(
  orthofinderVersion: number,
  groupingVersion: number,
  ogId: string,
  clusterId: string,
): string {
  return `og_region_graph/${_ofGTag(orthofinderVersion, groupingVersion)}/${ogId}/${clusterId}.json`;
}

/** Graph manifest listing every candidate OG (emitted or skipped). */
export function ogRegionGraphManifestPath(
  orthofinderVersion: number,
  groupingVersion: number,
): string {
  return `og_region_graph/${_ofGTag(orthofinderVersion, groupingVersion)}/_manifest.json`;
}

/** Trait-specific AF bundle — variants + group AF for one trait. */
export function ogRegionAfPath(
  orthofinderVersion: number,
  groupingVersion: number,
  traitId: string,
  ogId: string,
  clusterId: string,
): string {
  return `og_region_af/${_ofGTag(orthofinderVersion, groupingVersion)}/${traitId}/${ogId}/${clusterId}.json`;
}

/** Per-trait AF manifest. */
export function ogRegionAfManifestPath(
  orthofinderVersion: number,
  groupingVersion: number,
  traitId: string,
): string {
  return `og_region_af/${_ofGTag(orthofinderVersion, groupingVersion)}/${traitId}/_manifest.json`;
}

/** Cross-trait AF summary manifest (operator-facing; UI doesn't read). */
export function ogRegionAfSummaryManifestPath(
  orthofinderVersion: number,
  groupingVersion: number,
): string {
  return `og_region_af/${_ofGTag(orthofinderVersion, groupingVersion)}/_manifest.json`;
}

export function ogAlleleFreqPath(
  orthofinderVersion: number,
  groupingVersion: number,
  traitId: string,
): string {
  return `og_allele_freq/v${orthofinderVersion}/g${groupingVersion}/${traitId}.json`;
}

export function ogAlleleFreqLegacyPath(traitId: string): string {
  return `og_allele_freq/${traitId}.json`;
}

export function orthofinderOgMembersPath(version: number, chunkKey: string): string {
  return `orthofinder/v${version}/og-members/chunk_${chunkKey}.json`;
}

export function orthofinderBaegilmiAnnotationPath(version: number): string {
  return `orthofinder/v${version}/baegilmi_gene_annotation.json`;
}

export function orthofinderOgCategoriesPath(version: number): string {
  return `orthofinder/v${version}/og_categories.json`;
}

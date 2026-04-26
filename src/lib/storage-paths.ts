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

export function geneIndexManifestPath(version: number): string {
  return `gene_index/v${version}/_manifest.json`;
}

export function geneIndexPartitionPath(version: number, prefix: string): string {
  return `gene_index/v${version}/by_prefix/${prefix}.json`;
}

export function geneModelsManifestPath(version: number): string {
  return `gene_models/v${version}/_manifest.json`;
}

export function geneModelsPartitionPath(version: number, prefix: string): string {
  return `gene_models/v${version}/by_prefix/${prefix}.json`;
}

export function functionalIndexPath(version: number): string {
  return `functional_index/v${version}/index.json`;
}

export function traitHitsIndexPath(
  orthofinderVersion: number,
  groupingVersion: number,
): string {
  return `trait_hits/v${orthofinderVersion}_g${groupingVersion}/index.json`;
}

/** Per-gene SV overlap evidence index (built by scripts/build-gene-sv-index.py).
 * Keyed on (orthofinder version, svRelease) — gene_models currently version
 * lockstep with orthofinder, so a separate gm tag is redundant today. If the
 * two diverge, extend the key without changing call sites by adding a new
 * parameter + path segment. */
export function geneSvIndexPath(
  orthofinderVersion: number,
  svReleaseId: string,
): string {
  return `gene_sv_index/v${orthofinderVersion}_r${svReleaseId}/index.json`;
}

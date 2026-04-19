/**
 * Firebase Storage path builders for per-OG / per-version artifacts.
 *
 * Centralising these here keeps the upload-side (Python) and the read-side
 * (TS) layouts from drifting. Any path surfaced below is consumed by the
 * pipeline scripts as well — keep the string shapes stable, or update the
 * pipeline in lockstep.
 */

export function ogGeneCoordsPath(chunkKey: string): string {
  return `og_gene_coords/chunk_${chunkKey}.json`;
}

export function ogTubeMapPath(ogId: string): string {
  return `og_tubemap/${ogId}.json`;
}

export function ogRegionPath(ogId: string, clusterId: string): string {
  return `og_region/${ogId}/${clusterId}.json`;
}

export function ogRegionManifestPath(): string {
  return `og_region/_manifest.json`;
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

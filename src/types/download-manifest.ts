/**
 * Shape of downloads/_manifest.json — the UI's single source of truth for
 * the /download page Discovery section. Written by
 * scripts/generate-download-bundles.py.
 */

export interface DownloadFileMeta {
  size: number;
  sha256: string;
}

export interface DownloadTraitEntry {
  files: Record<string, DownloadFileMeta>;
  usable: boolean;
}

export interface DownloadManifest {
  orthofinderVersion: number;
  groupingVersion: number;
  generatedAt: string;
  appVersion: string;
  reference: { displayName: string; longName: string };
  traits: Record<string, DownloadTraitEntry>;
  crossTrait: { files: Record<string, DownloadFileMeta> };
}

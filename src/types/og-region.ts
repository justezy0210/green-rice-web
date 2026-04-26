/**
 * Compatibility shape consumed by current OG detail UI components.
 *
 * Runtime data is loaded from the v2 graph + AF bundles and projected into
 * this shape by useOgRegion. It is no longer read from versionless v1
 * `og_region/{og}/{cluster}.json` objects.
 */

import type {
  CultivarGeneCoord,
  TubeMapEdge,
  TubeMapNode,
  TubeMapPath,
  VariantEntry,
} from './orthogroup';

export interface RegionAnchor {
  cultivar: string;
  kind: 'tandem' | 'singleton' | 'dispersed';
  genes: CultivarGeneCoord[];
  regionSpan: { chr: string; start: number; end: number };
  flankBp: number;
}

export interface RegionLiftover {
  status: 'mapped' | 'partial' | 'unmapped' | 'multimap';
  irgspRegion: { chr: string; start: number; end: number } | null;
  coverage: number;
}

export interface RegionGraph {
  nodes: TubeMapNode[];
  edges: TubeMapEdge[];
  paths: TubeMapPath[];
}

export interface RegionAlleleFrequency {
  groupLabels: string[];
  variants: VariantEntry[];
}

export interface RegionStatus {
  graph: 'ok' | 'empty' | 'error';
  af: 'ok' | 'no_variants' | 'unmapped' | 'error';
  errorMessage?: string;
}

export interface RegionData {
  schemaVersion: number;
  ogId: string;
  clusterId: string;
  source: 'cultivar-anchor';
  anchor: RegionAnchor;
  liftover: RegionLiftover;
  graph: RegionGraph | null;
  alleleFrequency: RegionAlleleFrequency | null;
  status: RegionStatus;
}

export interface OgRegionManifestCluster {
  clusterId: string;
  cultivar: string;
  chr: string;
  start: number;
  end: number;
  geneCount: number;
  kind: 'tandem' | 'singleton' | 'dispersed';
  graphStatus: 'ok' | 'empty' | 'error';
  afStatus: 'ok' | 'no_variants' | 'unmapped' | 'error';
  variantCount: number;
}

export interface OgRegionManifestEntry {
  anchorCultivar?: string;
  clusters: OgRegionManifestCluster[];
  truncated?: boolean;
  error?: string;
}

export interface OgRegionManifest {
  schemaVersion: number;
  trait: string;
  clusterThreshold: number;
  flankBp: number;
  clusterCap: number;
  totalClusters: number;
  okClusters: number;
  elapsedSeconds: number;
  ogs: Record<string, OgRegionManifestEntry>;
}

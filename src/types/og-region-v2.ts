/**
 * Schema v2 for OG region data.
 *
 * Trait-neutral graph bundle + per-trait AF bundle; version-namespaced
 * under v{of}_g{g}. Contract locked in:
 *   docs/exec-plans/active/2026-04-19-og-region-expansion.md
 *
 * Legacy v1 (trait-baked single file at og_region/{og}/{cluster}.json)
 * keeps its `src/types/og-region.ts` types for the Release A dual-read
 * fallback. Release B removes the legacy types.
 */

import type {
  CultivarGeneCoord,
  TubeMapEdge,
  TubeMapNode,
  TubeMapPath,
  VariantEntry,
} from './orthogroup';

// ─── Pointer (downloads/_og_region_manifest.json) ─────────────

export interface OgRegionPointer {
  activeOrthofinderVersion: number;
  activeGroupingVersion: number;
  generatedAt: string;
  appVersion: string;
  graphManifest: string;
  afManifests: Record<string, string>;
}

// ─── Graph manifest ──────────────────────────────────────────

export type OgSkipReason =
  | 'NO_GENE_COORDS'
  | 'NO_ANCHOR_CULTIVAR'
  | 'NO_CLUSTERS'
  | 'EXTRACTOR_ERROR';

export type GraphStatus = 'ok' | 'empty' | 'error';

export interface GraphManifestCluster {
  clusterId: string;
  chr: string;
  start: number;
  end: number;
  geneCount: number;
  kind: 'tandem' | 'singleton' | 'dispersed';
  graphStatus: GraphStatus;
}

export type GraphManifestOgEntry =
  | {
      status: 'emitted';
      anchorCultivar: string;
      truncated: boolean;
      clusters: GraphManifestCluster[];
    }
  | {
      status: 'skipped';
      skipReason: OgSkipReason;
      clusters: [];
    };

export interface InputFingerprint {
  path?: string;
  sha256: string;
  size?: number;
  contentHash?: string;
}

export interface GraphManifest {
  schemaVersion: 2;
  orthofinderVersion: number;
  groupingVersion: number;
  generatedAt: string;
  extractorGitSha: string;
  inputFingerprints: {
    hal: InputFingerprint;
    gbz: InputFingerprint;
    geneCoordsDir: InputFingerprint;
    candidateListSha256: string;
  };
  clusterCap: number;
  flankBp: number;
  clusterThresholdBp: number;
  anchorPriority: string[];
  totals: {
    candidateOgs: number;
    ogsEmitted: number;
    ogsSkipped: number;
    clustersEmitted: number;
    statusCounts: Record<GraphStatus | `graph_${GraphStatus}`, number>;
    skipReasonCounts: Partial<Record<OgSkipReason, number>>;
  };
  ogs: Record<string, GraphManifestOgEntry>;
}

// ─── AF manifest (per trait) ─────────────────────────────────

export type AfStatus = 'ok' | 'no_variants' | 'unmapped' | 'error';

export interface AfManifestCluster {
  clusterId: string;
  afStatus: AfStatus;
  variantCount: number;
}

export interface AfManifestOgEntry {
  clusters: AfManifestCluster[];
}

export interface AfManifest {
  schemaVersion: 2;
  orthofinderVersion: number;
  groupingVersion: number;
  trait: string;
  usable: true;
  groupLabels: string[];
  generatedAt: string;
  extractorGitSha: string;
  inputFingerprints: {
    vcf: InputFingerprint;
    groupingsDocVersion: number;
  };
  totals: {
    ogsEmitted: number;
    clustersEmitted: number;
    statusCounts: Record<AfStatus | `af_${AfStatus}`, number>;
  };
  ogs: Record<string, AfManifestOgEntry>;
}

// ─── Cross-trait AF summary (operator-facing, UI does not read) ──

export interface AfSummaryManifest {
  schemaVersion: 2;
  orthofinderVersion: number;
  groupingVersion: number;
  generatedAt: string;
  traits: Record<
    string,
    { usable: true; ogsEmitted: number; clustersEmitted: number }
  >;
}

// ─── Runtime fetch state (per-cluster hooks) ─────────────────

/**
 * State machine for per-cluster region fetches. Distinguishes a pointer
 * that targets an absent object (`missing` — 404) from transient or
 * unknown failures (`unavailable` — 5xx, 403, network, JSON parse).
 * Abort events never transition state; the next effect overwrites.
 */
export type RegionFetchStatus =
  | 'idle'
  | 'loading'
  | 'ok'
  | 'missing'
  | 'unavailable';

// ─── Per-cluster graph JSON body ─────────────────────────────

export type GraphReasonCode =
  | 'OK'
  | 'NO_COHORT'
  | 'VG_CHUNK_EMPTY'
  | 'LIFT_FAIL';

export interface RegionDataGraph {
  schemaVersion: 2;
  ogId: string;
  clusterId: string;
  orthofinderVersion: number;
  source: 'cultivar-anchor';
  anchor: {
    cultivar: string;
    kind: 'tandem' | 'singleton' | 'dispersed';
    genes: CultivarGeneCoord[];
    regionSpan: { chr: string; start: number; end: number };
    flankBp: number;
  };
  liftover: {
    status: 'mapped' | 'partial' | 'unmapped' | 'multimap';
    irgspRegion: { chr: string; start: number; end: number } | null;
    coverage: number;
  };
  graph: {
    nodes: TubeMapNode[];
    edges: TubeMapEdge[];
    paths: TubeMapPath[];
  } | null;
  status: {
    graph: GraphStatus;
    reasonCode: GraphReasonCode;
    errorMessage?: string;
  };
}

// ─── Per-cluster AF JSON body ────────────────────────────────

export type AfReasonCode =
  | 'OK'
  | 'NO_VARIANTS'
  | 'COVERAGE_TOO_LOW'
  | 'VCF_FAIL';

export interface RegionDataAf {
  schemaVersion: 2;
  ogId: string;
  clusterId: string;
  trait: string;
  orthofinderVersion: number;
  groupingVersion: number;
  groupLabels: string[];
  variants: VariantEntry[];
  status: {
    af: AfStatus;
    reasonCode: AfReasonCode;
  };
}

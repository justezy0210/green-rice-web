/**
 * Single source of truth for per-cluster region status + display copy.
 * Consumed by OgDetailAlleleFreqTab and OgDetailGraphTab so both tabs
 * present liftover state identically.
 */

import type {
  OgRegionManifest,
  OgRegionManifestCluster,
  RegionData,
} from '@/types/orthogroup';

export type ClusterRegionStatus =
  | { kind: 'mapped'; coverage: number }
  | { kind: 'partial'; coverage: number }
  | { kind: 'unmapped'; coverage: number }
  | { kind: 'missing' }
  | { kind: 'error'; errorMessage?: string };

export interface ClusterStatusCopy {
  badge: string | null; // null when the default (mapped) case — no badge needed
  toneClass: string;
  caveat: string | null;
}

export function resolveClusterRegionStatus(
  region: RegionData | null,
  manifestEntry: OgRegionManifestCluster | null,
): ClusterRegionStatus {
  if (region) {
    const coverage = region.liftover.coverage;
    if (region.liftover.status === 'unmapped' || coverage < 0.5) {
      return { kind: 'unmapped', coverage };
    }
    if (coverage < 0.8) return { kind: 'partial', coverage };
    return { kind: 'mapped', coverage };
  }
  if (manifestEntry) {
    if (manifestEntry.graphStatus === 'error') {
      return { kind: 'error' };
    }
    return { kind: 'missing' };
  }
  return { kind: 'missing' };
}

export function findManifestCluster(
  manifest: OgRegionManifest | null,
  ogId: string,
  clusterId: string,
): OgRegionManifestCluster | null {
  if (!manifest) return null;
  const entry = manifest.ogs[ogId];
  if (!entry) return null;
  return entry.clusters.find((c) => c.clusterId === clusterId) ?? null;
}

export function statusCopy(status: ClusterRegionStatus): ClusterStatusCopy {
  switch (status.kind) {
    case 'mapped':
      return {
        badge: null,
        toneClass: 'bg-green-50 text-green-700 border-green-200',
        caveat: null,
      };
    case 'partial': {
      const pct = Math.round(status.coverage * 100);
      return {
        badge: 'Partial lift',
        toneClass: 'bg-amber-50 text-amber-700 border-amber-300',
        caveat: `Liftover covers ${pct}% of the cluster span. Events in unmapped portions are absent from this table.`,
      };
    }
    case 'unmapped':
      return {
        badge: 'Non-syntenic candidate',
        toneClass: 'bg-orange-50 text-orange-700 border-orange-300',
        caveat:
          'This cluster did not map stably onto the IRGSP reference. The cluster may represent a non-syntenic region, an assembly/annotation difference, or a lift-over limitation — check the raw cluster coordinates before drawing conclusions.',
      };
    case 'missing':
      return {
        badge: 'Region data unavailable',
        toneClass: 'bg-gray-50 text-gray-600 border-gray-200',
        caveat: 'Cluster-derived region data has not been produced for this cluster yet.',
      };
    case 'error':
      return {
        badge: 'Region extraction failed',
        toneClass: 'bg-red-50 text-red-700 border-red-200',
        caveat: status.errorMessage
          ? `Cluster-derived region extraction failed: ${status.errorMessage}`
          : 'Cluster-derived region extraction failed for this cluster.',
      };
  }
}

import { useEffect, useState } from 'react';
import { publicDownloadUrl } from '@/lib/download-urls';
import { ogRegionPointerPath } from '@/lib/storage-paths';
import type { OgRegionManifest, RegionData } from '@/types/orthogroup';
import type { GraphManifest, OgRegionPointer } from '@/types/og-region-v2';
import { useOgRegionGraph } from './useOgRegionGraph';
import { useOgRegionAf } from './useOgRegionAf';

/**
 * Per-cluster region data — v2-only adapter.
 *
 * The old trait-baked single-file path (`og_region/{og}/{cluster}.json`)
 * was retired after the 2026-04-21 v6_g4 promote. This hook now combines
 * the v2 graph bundle (trait-neutral) and the per-trait AF bundle into
 * the legacy `RegionData` shape so existing Graph / AF tab components
 * keep working without internal restructuring.
 *
 * When `traitId` is null (e.g. Graph tab), the AF side is skipped and
 * the returned shape carries only graph + anchor + liftover.
 */
export function useOgRegion(
  ogId: string | null,
  clusterId: string | null,
  traitId?: string | null,
): { data: RegionData | null; loading: boolean } {
  const g = useOgRegionGraph(ogId, clusterId);
  const a = useOgRegionAf(ogId, clusterId, traitId ?? null);

  if (!g.data) {
    return { data: null, loading: g.loading };
  }

  const merged: RegionData = {
    schemaVersion: 1,
    ogId: g.data.ogId,
    clusterId: g.data.clusterId,
    source: 'cultivar-anchor',
    anchor: g.data.anchor,
    liftover: g.data.liftover,
    graph: g.data.graph,
    alleleFrequency: a.data
      ? { groupLabels: a.data.groupLabels, variants: a.data.variants }
      : null,
    status: {
      graph: g.data.status.graph,
      af: a.data?.status.af ?? 'no_variants',
      errorMessage: g.data.status.errorMessage,
    },
  };
  return {
    data: merged,
    loading: g.loading || (traitId ? a.loading : false),
  };
}

type ManifestState = 'idle' | 'loaded';

/**
 * v2-only manifest loader. Fetches the og_region v2 pointer, then the
 * graph manifest it points to, and projects the result into the legacy
 * `OgRegionManifest` shape for existing consumers (OgDrawer,
 * OgDetailGraphTab, OgDetailAlleleFreqTab). Legacy v1 fallback was
 * removed after the v6_g4 promote.
 */
export function useOgRegionManifest(): {
  manifest: OgRegionManifest | null;
  loading: boolean;
} {
  const [manifest, setManifest] = useState<OgRegionManifest | null>(null);
  const [status, setStatus] = useState<ManifestState>('idle');

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const pRes = await fetch(publicDownloadUrl(ogRegionPointerPath()), {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!pRes.ok) {
          if (!controller.signal.aborted) setStatus('loaded');
          return;
        }
        const pointer = (await pRes.json()) as OgRegionPointer;
        const gRes = await fetch(publicDownloadUrl(pointer.graphManifest), {
          signal: controller.signal,
        });
        if (!gRes.ok) {
          if (!controller.signal.aborted) setStatus('loaded');
          return;
        }
        const graph = (await gRes.json()) as GraphManifest;
        if (!controller.signal.aborted) {
          setManifest(graphManifestToLegacy(graph));
          setStatus('loaded');
        }
      } catch {
        if (!controller.signal.aborted) setStatus('loaded');
      }
    })();
    return () => controller.abort();
  }, []);

  return { manifest, loading: status === 'idle' };
}

/**
 * Project v2 graph manifest → legacy OgRegionManifest shape. Skipped
 * OGs carry `error: skipReason` with empty clusters; emitted OGs keep
 * their cluster array. AF status is not in the graph manifest by
 * design (useOgRegionAf carries it per cluster), so we fill
 * `no_variants` as a placeholder that never asserts AF=ok.
 */
function graphManifestToLegacy(graph: GraphManifest): OgRegionManifest {
  const ogs: OgRegionManifest['ogs'] = {};
  for (const [ogId, entry] of Object.entries(graph.ogs)) {
    if (entry.status === 'emitted') {
      ogs[ogId] = {
        anchorCultivar: entry.anchorCultivar,
        truncated: entry.truncated,
        clusters: entry.clusters.map((c) => ({
          clusterId: c.clusterId,
          cultivar: entry.anchorCultivar,
          chr: c.chr,
          start: c.start,
          end: c.end,
          geneCount: c.geneCount,
          kind: c.kind,
          graphStatus: c.graphStatus,
          afStatus: 'no_variants',
          variantCount: 0,
        })),
      };
    } else {
      ogs[ogId] = {
        clusters: [],
        error: entry.skipReason,
      };
    }
  }
  return {
    schemaVersion: 1,
    trait: '(trait-neutral v2 — use useOgRegionAf for trait-specific data)',
    clusterThreshold: graph.clusterThresholdBp,
    flankBp: graph.flankBp,
    clusterCap: graph.clusterCap,
    totalClusters: graph.totals.clustersEmitted,
    okClusters: graph.totals.statusCounts?.graph_ok ?? 0,
    elapsedSeconds: 0,
    ogs,
  };
}

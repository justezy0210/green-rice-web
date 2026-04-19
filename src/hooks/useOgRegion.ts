import { useEffect, useState } from 'react';
import { fetchOgRegion, fetchOgRegionManifest } from '@/lib/og-region-service';
import { publicDownloadUrl } from '@/lib/download-urls';
import { ogRegionPointerPath } from '@/lib/storage-paths';
import type { OgRegionManifest, RegionData } from '@/types/orthogroup';
import type { GraphManifest, OgRegionPointer } from '@/types/og-region-v2';

type RegionState = { key: string; data: RegionData | null };
const EMPTY_REGION: RegionState = { key: '', data: null };

export function useOgRegion(
  ogId: string | null,
  clusterId: string | null,
): { data: RegionData | null; loading: boolean } {
  const key = ogId && clusterId ? `${ogId}/${clusterId}` : '';
  const [state, setState] = useState<RegionState>(EMPTY_REGION);

  useEffect(() => {
    if (!ogId || !clusterId) return;
    const controller = new AbortController();
    fetchOgRegion(ogId, clusterId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setState({ key, data: result });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ key, data: null });
      });
    return () => controller.abort();
  }, [ogId, clusterId, key]);

  const isCurrent = state.key === key;
  return {
    data: isCurrent ? state.data : null,
    loading: Boolean(key) && !isCurrent,
  };
}

type ManifestState = 'idle' | 'loaded';

/**
 * Dual-read adapter: prefers the v2 pointer + graph manifest published
 * under `downloads/_og_region_manifest.json` + `og_region_graph/v{of}_g{g}/
 * _manifest.json`. If those are missing (Release A transition or before
 * any v2 promote), falls back to the legacy single-trait
 * `og_region/_manifest.json`. Returns the legacy shape either way so
 * existing consumers (OgDrawer, OgDetailGraphTab, OgDetailAlleleFreqTab)
 * don't have to branch.
 *
 * Release B removes the legacy branch.
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
      // 1. Try v2 pointer + graph manifest.
      try {
        const pRes = await fetch(publicDownloadUrl(ogRegionPointerPath()), {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (pRes.ok) {
          const pointer = (await pRes.json()) as OgRegionPointer;
          const gRes = await fetch(publicDownloadUrl(pointer.graphManifest), {
            signal: controller.signal,
          });
          if (gRes.ok) {
            const graph = (await gRes.json()) as GraphManifest;
            const legacy = graphManifestToLegacy(graph);
            if (!controller.signal.aborted) {
              setManifest(legacy);
              setStatus('loaded');
            }
            return;
          }
        }
      } catch {
        // fall through to legacy
      }

      // 2. Fallback: legacy og_region/_manifest.json.
      try {
        const legacy = await fetchOgRegionManifest(controller.signal);
        if (!controller.signal.aborted) {
          setManifest(legacy);
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
 * Normalize a v2 graph manifest into the legacy shape the existing UI
 * consumers expect. Skipped OGs appear with `clusters: []` + `error`
 * set to the skipReason; emitted OGs carry their cluster array.
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
          // AF status is not in the graph manifest by design. Consumers
          // that need it should move to useOgRegionAf. For legacy
          // compatibility we say "no_variants" so nothing claims AF=ok
          // without reading the AF bundle.
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

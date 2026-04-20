/**
 * Anchor representativeness tier for an OG cluster.
 *
 * Every per-cluster AF panel in the DB is reasoning from ONE anchor
 * cultivar's coordinates. The tier answers: does that anchor position
 * represent this OG across the panel well enough that anchor-locus
 * AF can be read as a locus-specific signal at all?
 *
 * Tier thresholds are initial estimates (scope.md 2026-04-20). Refine
 * with real data observation during Stage 2.
 *
 *   representative:    occupancy ≥ 0.70 AND elsewhere ≤ 0.20
 *   mixed:             0.40 ≤ occupancy < 0.70  OR  elsewhere > 0.20
 *   nonrepresentative: occupancy < 0.40
 *
 * Reference (IRGSP) is not counted — it's the coordinate space, not a
 * panel member of the OG.
 */

import { isReferencePathCultivar } from '@/lib/irgsp-constants';
import type { GeneCluster, OgGeneCoords } from '@/types/orthogroup';

export type AnchorRepresentativenessTier =
  | 'representative'
  | 'mixed'
  | 'nonrepresentative';

export interface TierMetrics {
  occupancy: number;
  elsewhere: number;
  noAnnotation: number;
  cultivarCount: number;
  counts: {
    annotatedHere: number;
    elsewhere: number;
    noAnnotation: number;
  };
  tier: AnchorRepresentativenessTier;
}

function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart <= bEnd && aEnd >= bStart;
}

export function classifyAnchorTier(
  cluster: GeneCluster,
  coords: OgGeneCoords,
): TierMetrics {
  const cultivars = Object.keys(coords).filter(
    (c) => !isReferencePathCultivar(c),
  );
  const N = cultivars.length;

  let annotatedHere = 0;
  let elsewhere = 0;
  let noAnnotation = 0;

  for (const cultivar of cultivars) {
    const genes = coords[cultivar] ?? [];
    if (genes.length === 0) {
      noAnnotation++;
      continue;
    }
    const hasHere = genes.some(
      (g) =>
        g.chr === cluster.chr &&
        rangesOverlap(g.start, g.end, cluster.start, cluster.end),
    );
    if (hasHere) annotatedHere++;
    else elsewhere++;
  }

  const occupancy = N > 0 ? annotatedHere / N : 0;
  const elsewhereFrac = N > 0 ? elsewhere / N : 0;
  const noAnnotationFrac = N > 0 ? noAnnotation / N : 0;

  let tier: AnchorRepresentativenessTier;
  if (occupancy >= 0.7 && elsewhereFrac <= 0.2) {
    tier = 'representative';
  } else if (occupancy < 0.4) {
    tier = 'nonrepresentative';
  } else {
    tier = 'mixed';
  }

  return {
    occupancy,
    elsewhere: elsewhereFrac,
    noAnnotation: noAnnotationFrac,
    cultivarCount: N,
    counts: {
      annotatedHere,
      elsewhere,
      noAnnotation,
    },
    tier,
  };
}

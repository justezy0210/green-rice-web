/**
 * Path ordering strategies for TubeMapRenderer.
 *
 * - `phenotype`: group paths by phenotype group label (IRGSP first), then by
 *   cultivar name. Phase-block-split paths of the same cultivar stay adjacent.
 *
 * - `graphOverlap`: cluster cultivars by shared structural alternatives in the
 *   pangenome graph using length-weighted Jaccard distance, then order leaves
 *   via UPGMA. This is a graph-structure order, not an AF similarity order.
 *   Naming matters — never call this "AF-like": multi-allelic bubbles, SV
 *   size weighting and split phase blocks make the two concepts differ.
 */

import { isReferencePathCultivar } from '@/lib/irgsp-constants';
import type { TubeMapPath, TubeMapNode } from '@/types/orthogroup';
import type { CultivarGroupAssignment } from '@/types/grouping';

export type TubeMapSortMode = 'phenotype' | 'graphOverlap';

export function parseCultivar(pathName: string): { cultivar: string; isRef: boolean } {
  const cultivar = pathName.split('#')[0];
  return { cultivar, isRef: isReferencePathCultivar(cultivar) };
}

export function orderByPhenotype(
  paths: TubeMapPath[],
  groupByCultivar?: Record<string, CultivarGroupAssignment> | null,
  groupLabelsOrder?: string[],
): TubeMapPath[] {
  const order = groupLabelsOrder ?? [];
  const labelRank = new Map<string, number>();
  order.forEach((lbl, i) => labelRank.set(lbl, i));

  const rank = (p: TubeMapPath): number => {
    const { cultivar, isRef } = parseCultivar(p.name);
    if (isRef) return -1;
    const groupLabel = groupByCultivar?.[cultivar]?.groupLabel;
    if (!groupLabel) return order.length;
    return labelRank.get(groupLabel) ?? order.length;
  };

  return [...paths].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    const ca = parseCultivar(a.name).cultivar;
    const cb = parseCultivar(b.name).cultivar;
    if (ca !== cb) return ca.localeCompare(cb);
    return a.name.localeCompare(b.name);
  });
}

interface CultivarAggregate {
  cultivar: string;
  isRef: boolean;
  visitSet: Set<string>;
  paths: TubeMapPath[];
}

export function orderByGraphOverlap(
  paths: TubeMapPath[],
  divergentNodes: Set<string>,
  nodeById: Map<string, TubeMapNode>,
): TubeMapPath[] {
  const byCultivar = new Map<string, CultivarAggregate>();
  for (const p of paths) {
    const { cultivar, isRef } = parseCultivar(p.name);
    let entry = byCultivar.get(cultivar);
    if (!entry) {
      entry = { cultivar, isRef, visitSet: new Set<string>(), paths: [] };
      byCultivar.set(cultivar, entry);
    }
    entry.paths.push(p);
    for (const v of p.visits) {
      if (divergentNodes.has(v.nodeId)) entry.visitSet.add(v.nodeId);
    }
  }

  const cultivars = Array.from(byCultivar.keys());

  const distance = (a: string, b: string): number => {
    const setA = byCultivar.get(a)!.visitSet;
    const setB = byCultivar.get(b)!.visitSet;
    const all = new Set<string>();
    setA.forEach((id) => all.add(id));
    setB.forEach((id) => all.add(id));
    let inter = 0;
    let union = 0;
    all.forEach((id) => {
      const len = nodeById.get(id)?.len ?? 1;
      const inA = setA.has(id);
      const inB = setB.has(id);
      if (inA && inB) inter += len;
      if (inA || inB) union += len;
    });
    if (union === 0) return 0;
    return 1 - inter / union;
  };

  const leafOrder = upgmaLeafOrder(cultivars, distance);
  const refs = leafOrder.filter((c) => byCultivar.get(c)!.isRef);
  const nonRefs = leafOrder.filter((c) => !byCultivar.get(c)!.isRef);
  const ordered = [...refs, ...nonRefs];

  const result: TubeMapPath[] = [];
  for (const c of ordered) {
    const entry = byCultivar.get(c)!;
    const sorted = [...entry.paths].sort((a, b) => a.name.localeCompare(b.name));
    result.push(...sorted);
  }
  return result;
}

/**
 * UPGMA with simple leaf ordering: at each merge, smaller subtree first.
 * Stable, deterministic; sufficient for the 11–12 cultivar scale.
 */
function upgmaLeafOrder(
  items: string[],
  distance: (a: string, b: string) => number,
): string[] {
  if (items.length <= 1) return [...items];

  interface Cluster {
    leaves: string[];
    size: number;
  }
  const clusters: Cluster[] = items.map((id) => ({ leaves: [id], size: 1 }));

  const key = (i: number, j: number) => `${Math.min(i, j)}|${Math.max(i, j)}`;
  const dist = new Map<string, number>();
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      dist.set(key(i, j), distance(items[i], items[j]));
    }
  }

  let active = items.map((_, i) => i);

  while (active.length > 1) {
    let bestI = active[0];
    let bestJ = active[1];
    let bestD = Infinity;
    for (let a = 0; a < active.length; a++) {
      for (let b = a + 1; b < active.length; b++) {
        const ia = active[a];
        const ib = active[b];
        const d = dist.get(key(ia, ib));
        if (d !== undefined && d < bestD) {
          bestD = d;
          bestI = ia;
          bestJ = ib;
        }
      }
    }
    const ci = clusters[bestI];
    const cj = clusters[bestJ];
    const merged: Cluster = {
      leaves:
        ci.size <= cj.size ? [...ci.leaves, ...cj.leaves] : [...cj.leaves, ...ci.leaves],
      size: ci.size + cj.size,
    };
    const newIdx = clusters.length;
    clusters.push(merged);

    for (const k of active) {
      if (k === bestI || k === bestJ) continue;
      const dIK = dist.get(key(bestI, k)) ?? 0;
      const dJK = dist.get(key(bestJ, k)) ?? 0;
      const dMK = (ci.size * dIK + cj.size * dJK) / (ci.size + cj.size);
      dist.set(key(newIdx, k), dMK);
    }

    active = active.filter((i) => i !== bestI && i !== bestJ);
    active.push(newIdx);
  }

  return clusters[active[0]].leaves;
}

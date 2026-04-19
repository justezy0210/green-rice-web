import type { OgTubeMapData, TubeMapNode } from '@/types/orthogroup';
import type { CultivarGroupAssignment } from '@/types/grouping';
import { parseCultivar, type TubeMapSortMode } from '@/lib/tube-map-ordering';

export const PADDING = 16;
export const NODE_HEIGHT = 16;
export const PATH_SPACING = 22;
export const NODE_GAP = 4;
export const SVG_WIDTH = 1400;
export const LABEL_WIDTH = 300;
const GROUP_GAP = 10;

export interface NodePosition {
  node: TubeMapNode;
  x: number;
  width: number;
  isShared?: boolean;
  nodeCount?: number;
}

export interface TubeMapLayout {
  nodePositions: NodePosition[];
  nodeMap: Map<string, NodePosition>;
  totalWidth: number;
}

export interface RowMeta {
  rowY: number[];
  dividers: { y: number; label?: string }[];
  totalRowHeight: number;
}

export function computeSharedNodes(data: OgTubeMapData): Set<string> {
  const cultivarNodeSets = new Map<string, Set<string>>();
  for (const p of data.paths) {
    const cultivar = parseCultivar(p.name).cultivar;
    let set = cultivarNodeSets.get(cultivar);
    if (!set) {
      set = new Set<string>();
      cultivarNodeSets.set(cultivar, set);
    }
    for (const v of p.visits) set.add(v.nodeId);
  }
  const shared = new Set<string>();
  for (const n of data.nodes) {
    let inAll = true;
    for (const set of cultivarNodeSets.values()) {
      if (!set.has(n.id)) {
        inAll = false;
        break;
      }
    }
    if (inAll) shared.add(n.id);
  }
  return shared;
}

export function buildRowMeta(
  paths: { name: string }[],
  groupByCultivar: Record<string, CultivarGroupAssignment> | null | undefined,
  sortMode: TubeMapSortMode,
): RowMeta {
  const rowY: number[] = [];
  const dividers: { y: number; label?: string }[] = [];
  let y = 0;
  let prevBucket: string | null = null;

  const bucketOf = (pathName: string): string => {
    const parsed = parseCultivar(pathName);
    if (parsed.isRef) return '__ref__';
    if (sortMode !== 'phenotype') return '__single__';
    const lbl = groupByCultivar?.[parsed.cultivar]?.groupLabel;
    return lbl ?? '__unassigned__';
  };
  const bucketLabel = (bucket: string): string | undefined => {
    if (bucket === '__ref__') return 'Reference';
    if (bucket === '__unassigned__') return 'Unassigned';
    if (bucket === '__single__') return undefined;
    return bucket;
  };

  for (let i = 0; i < paths.length; i++) {
    const bucket = bucketOf(paths[i].name);
    if (prevBucket !== null && bucket !== prevBucket) {
      y += GROUP_GAP;
      dividers.push({ y, label: bucketLabel(bucket) });
      y += 4;
    } else if (prevBucket === null && sortMode === 'phenotype') {
      const lbl = bucketLabel(bucket);
      if (lbl) dividers.push({ y, label: lbl });
    }
    rowY.push(y);
    y += PATH_SPACING;
    prevBucket = bucket;
  }

  return { rowY, dividers, totalRowHeight: y };
}

export function computeLayout(data: OgTubeMapData): TubeMapLayout {
  const refPath = data.paths.find((p) => {
    const parsed = parseCultivar(p.name);
    return parsed.isRef || data.annotate[p.name]?.type === 'reference';
  });
  const refOrder = refPath
    ? refPath.visits.map((v) => v.nodeId)
    : data.nodes.map((n) => n.id);

  const nodeById = new Map(data.nodes.map((n) => [n.id, n]));
  const sharedNodes = computeSharedNodes(data);

  // Edge adjacency — used to place non-ref divergent nodes near their bubble
  const backwardAdj = new Map<string, string[]>();
  const forwardAdj = new Map<string, string[]>();
  for (const e of data.edges) {
    if (!backwardAdj.has(e.to)) backwardAdj.set(e.to, []);
    backwardAdj.get(e.to)!.push(e.from);
    if (!forwardAdj.has(e.from)) forwardAdj.set(e.from, []);
    forwardAdj.get(e.from)!.push(e.to);
  }

  // For each node, find the nearest preceding node that is in ref order
  // (BFS backward through edges). This becomes the insertion anchor.
  const refIndex = new Map<string, number>();
  refOrder.forEach((id, i) => refIndex.set(id, i));

  function findRefAnchor(start: string): string | null {
    const seen = new Set<string>([start]);
    const queue = [start];
    while (queue.length) {
      const cur = queue.shift()!;
      const preds = backwardAdj.get(cur) ?? [];
      for (const p of preds) {
        if (seen.has(p)) continue;
        if (refIndex.has(p)) return p;
        seen.add(p);
        queue.push(p);
      }
    }
    return null;
  }

  // Build full node order: ref order, with non-ref divergent nodes inserted
  // right after their ref anchor (bubble position), preserving a deterministic
  // local order by node length.
  const insertAfter = new Map<string, string[]>();
  for (const n of data.nodes) {
    if (refIndex.has(n.id)) continue;
    const anchor = findRefAnchor(n.id);
    if (anchor === null) continue;
    if (!insertAfter.has(anchor)) insertAfter.set(anchor, []);
    insertAfter.get(anchor)!.push(n.id);
  }
  const nodeOrder: string[] = [];
  for (const id of refOrder) {
    nodeOrder.push(id);
    const extras = insertAfter.get(id);
    if (extras) {
      extras.sort((a, b) => (nodeById.get(b)?.len ?? 0) - (nodeById.get(a)?.len ?? 0));
      nodeOrder.push(...extras);
    }
  }
  // Stragglers that had no anchor (disconnected) — append at end
  const already = new Set(nodeOrder);
  for (const n of data.nodes) {
    if (!already.has(n.id)) nodeOrder.push(n.id);
  }
  void forwardAdj;

  const mergedBlocks: {
    nodeIds: string[];
    totalLen: number;
    isShared: boolean;
    seq?: string;
  }[] = [];
  let currentBlock: string[] = [];
  let currentShared = true;

  for (const nodeId of nodeOrder) {
    const isShared = sharedNodes.has(nodeId);
    if (currentBlock.length > 0 && isShared !== currentShared) {
      const totalLen = currentBlock.reduce(
        (s, id) => s + (nodeById.get(id)?.len ?? 0),
        0,
      );
      const seq = currentShared
        ? undefined
        : currentBlock.map((id) => nodeById.get(id)?.seq ?? '').join('');
      mergedBlocks.push({
        nodeIds: currentBlock,
        totalLen,
        isShared: currentShared,
        seq,
      });
      currentBlock = [];
    }
    currentShared = isShared;
    currentBlock.push(nodeId);
  }
  if (currentBlock.length > 0) {
    const totalLen = currentBlock.reduce(
      (s, id) => s + (nodeById.get(id)?.len ?? 0),
      0,
    );
    mergedBlocks.push({
      nodeIds: currentBlock,
      totalLen,
      isShared: currentShared,
    });
  }

  // Account for NODE_GAP accumulation so the last block fits inside PADDING.
  const gapTotal = Math.max(0, mergedBlocks.length - 1) * NODE_GAP;
  const plotWidth = SVG_WIDTH - LABEL_WIDTH - PADDING * 2 - gapTotal;
  const totalLen = mergedBlocks.reduce((s, b) => s + b.totalLen, 0);

  const nodePositions: NodePosition[] = [];
  const nodeMap = new Map<string, NodePosition>();
  let xPos = LABEL_WIDTH;

  for (const block of mergedBlocks) {
    const width = Math.max(
      (block.totalLen / totalLen) * plotWidth,
      block.isShared ? 8 : 6,
    );
    const mergedNode: TubeMapNode = {
      id:
        block.nodeIds.length === 1
          ? block.nodeIds[0]
          : `${block.nodeIds[0]}..${block.nodeIds[block.nodeIds.length - 1]}`,
      len: block.totalLen,
      seq: block.seq,
    };
    const np: NodePosition = {
      node: mergedNode,
      x: xPos,
      width,
      isShared: block.isShared,
      nodeCount: block.nodeIds.length,
    };
    nodePositions.push(np);
    for (const nid of block.nodeIds) {
      nodeMap.set(nid, np);
    }
    xPos += width + NODE_GAP;
  }

  // The effective total width is the right edge of the last block + PADDING.
  const lastX = nodePositions.length
    ? nodePositions[nodePositions.length - 1].x +
      nodePositions[nodePositions.length - 1].width
    : LABEL_WIDTH;
  const totalWidth = Math.max(SVG_WIDTH, lastX + PADDING);

  return { nodePositions, nodeMap, totalWidth };
}

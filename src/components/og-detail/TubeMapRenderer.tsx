import { useMemo, useState } from 'react';
import type { OgGeneCoords, OgTubeMapData, TubeMapNode } from '@/types/orthogroup';
import type { CultivarGroupAssignment } from '@/types/grouping';
import {
  orderByPhenotype,
  orderByGraphOverlap,
  parseCultivar,
  type TubeMapSortMode,
} from '@/lib/tube-map-ordering';
import {
  annotationDisplay,
  getPathAnnotationStatus,
} from '@/lib/path-annotation-overlap';
import { TubeMapLegend } from './TubeMapLegend';
import {
  buildRowMeta,
  computeLayout,
  computeSharedNodes,
  NODE_HEIGHT,
  PADDING,
} from '@/lib/tube-map-layout';

interface Props {
  data: OgTubeMapData;
  coords?: OgGeneCoords | null;
  groupByCultivar?: Record<string, CultivarGroupAssignment> | null;
  groupColorMap?: Record<string, { bg: string; border: string }>;
  groupLabelsOrder?: string[];
  sortMode?: TubeMapSortMode;
}

function parsePathName(name: string): { cultivar: string; display: string; isRef: boolean } {
  const { cultivar, isRef } = parseCultivar(name);
  const rangeMatch = name.match(/\[(\d+)-(\d+)\]/);
  const chrMatch = name.match(/#(chr\w+)/);
  let display = cultivar;
  if (chrMatch) display += ` ${chrMatch[1]}`;
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);
    display += `:${(start / 1e6).toFixed(2)}–${(end / 1e6).toFixed(2)}M`;
  }
  return { cultivar, display, isRef };
}

const REF_COLOR = '#9ca3af';
const CULTIVAR_PALETTE = [
  '#7c3aed', '#0d9488', '#3b82f6', '#f59e0b',
  '#ef4444', '#ec4899', '#8b5cf6', '#06b6d4',
  '#f97316', '#84cc16', '#6366f1', '#14b8a6',
];

export function TubeMapRenderer({
  data,
  coords,
  groupByCultivar,
  groupColorMap = {},
  groupLabelsOrder,
  sortMode = 'phenotype',
}: Props) {
  const layout = useMemo(() => computeLayout(data), [data]);

  const orderedPaths = useMemo(() => {
    if (sortMode === 'graphOverlap') {
      const nodeById = new Map(data.nodes.map((n) => [n.id, n]));
      const sharedNodes = computeSharedNodes(data);
      const divergentNodes = new Set(
        data.nodes.map((n) => n.id).filter((id) => !sharedNodes.has(id)),
      );
      return orderByGraphOverlap(data.paths, divergentNodes, nodeById);
    }
    return orderByPhenotype(data.paths, groupByCultivar, groupLabelsOrder);
  }, [data, sortMode, groupByCultivar, groupLabelsOrder]);

  const rowMeta = useMemo(
    () => buildRowMeta(orderedPaths, groupByCultivar, sortMode),
    [orderedPaths, groupByCultivar, sortMode],
  );

  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: TubeMapNode } | null>(null);

  const totalHeight =
    PADDING * 2 + NODE_HEIGHT + 20 + rowMeta.totalRowHeight + 20;

  return (
    <div className="overflow-x-auto relative" onMouseLeave={() => setTooltip(null)}>
      {tooltip && (
        <div
          className="absolute z-10 bg-gray-900 text-white text-[10px] rounded px-2 py-1.5 pointer-events-none max-w-xs"
          style={{ left: tooltip.x, top: tooltip.y + NODE_HEIGHT + 8 }}
        >
          <div className="font-medium">
            Node {tooltip.node.id} ({tooltip.node.len} bp)
          </div>
          {tooltip.node.seq && (
            <div className="font-mono mt-1 break-all leading-tight text-[9px] text-gray-300">
              {tooltip.node.seq.length > 80
                ? tooltip.node.seq.slice(0, 40) + '…' + tooltip.node.seq.slice(-40)
                : tooltip.node.seq}
            </div>
          )}
        </div>
      )}
      <svg
        width={layout.totalWidth}
        height={totalHeight}
        viewBox={`0 0 ${layout.totalWidth} ${totalHeight}`}
        style={{
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          display: 'block',
        }}
      >
        <g>
          <text
            x={PADDING}
            y={PADDING + NODE_HEIGHT / 2}
            fontSize={9}
            fill="#9ca3af"
            dominantBaseline="central"
          >
            Graph nodes
          </text>
          {layout.nodePositions.map((np) => (
            <g
              key={np.node.id}
              className="cursor-pointer"
              onMouseEnter={() => {
                setTooltip({ x: np.x, y: PADDING, node: np.node });
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              <rect
                x={np.x}
                y={PADDING}
                width={np.width}
                height={NODE_HEIGHT}
                rx={3}
                fill={np.isShared ? '#f3f4f6' : '#fef3c7'}
                stroke={np.isShared ? '#d1d5db' : '#f59e0b'}
                strokeWidth={np.isShared ? 0.5 : 1.5}
                className="hover:fill-gray-200 transition-colors"
              />
              {np.width > 20 && (
                <text
                  x={np.x + np.width / 2}
                  y={PADDING + NODE_HEIGHT / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={7}
                  fill={np.isShared ? '#9ca3af' : '#92400e'}
                >
                  {np.isShared && np.nodeCount && np.nodeCount > 1
                    ? `${(np.node.len / 1000).toFixed(1)}kb`
                    : `${np.node.len}bp`}
                </text>
              )}
            </g>
          ))}
        </g>

        {sortMode === 'phenotype' &&
          rowMeta.dividers.map((d, i) => {
            const y = PADDING + NODE_HEIGHT + 20 + d.y;
            return (
              <g key={`div-${i}`}>
                <line
                  x1={PADDING}
                  y1={y}
                  x2={layout.totalWidth - PADDING}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth={0.5}
                />
                {d.label && (
                  <text x={PADDING} y={y - 3} fontSize={8} fill="#9ca3af" fontWeight={500}>
                    {d.label}
                  </text>
                )}
              </g>
            );
          })}

        {orderedPaths.map((path, pathIdx) => {
          const y = PADDING + NODE_HEIGHT + 20 + rowMeta.rowY[pathIdx];
          const parsed = parsePathName(path.name);
          const ann = data.annotate[path.name];
          const isRef = parsed.isRef || ann?.type === 'reference';
          const groupLabel = groupByCultivar?.[parsed.cultivar]?.groupLabel;
          const groupColor = groupLabel ? groupColorMap[groupLabel] : null;
          const cultivarIdx = isRef ? -1 : pathIdx - 1;
          const color = isRef
            ? REF_COLOR
            : groupColor
              ? groupColor.border
              : CULTIVAR_PALETTE[cultivarIdx % CULTIVAR_PALETTE.length];
          const label = ann?.label ?? parsed.display;
          const tubeHeight = 10;

          const annStatus = getPathAnnotationStatus(path.name, coords ?? null);
          const annDisp = annotationDisplay(annStatus);
          const dim = annDisp?.dim ?? false;
          const tubeOpacity = dim ? 0.25 : 0.7;
          const connectorOpacity = dim ? 0.2 : 0.5;
          const labelOpacity = dim ? 0.55 : 1;

          const segments = path.visits
            .map((v) => layout.nodeMap.get(v.nodeId))
            .filter((np): np is (typeof layout.nodePositions)[0] => !!np);

          const fullLabel = [
            annDisp?.badge,
            label,
            annDisp?.label ? `· ${annDisp.label}` : '',
          ]
            .filter(Boolean)
            .join(' ')
            .trim();
          const MAX_LABEL_CHARS = 42;
          const displayLabel =
            fullLabel.length > MAX_LABEL_CHARS
              ? `${fullLabel.slice(0, MAX_LABEL_CHARS - 1)}…`
              : fullLabel;

          return (
            <g key={path.name}>
              <text
                x={PADDING}
                y={y + tubeHeight / 2}
                textAnchor="start"
                dominantBaseline="central"
                fontSize={10}
                fill={color}
                fontWeight={isRef ? 600 : 400}
                opacity={labelOpacity}
              >
                <title>
                  {fullLabel}
                  {annDisp?.tooltip ? `\n\n${annDisp.tooltip}` : ''}
                </title>
                {displayLabel}
              </text>
              {segments.map((np) => (
                <rect
                  key={`${path.name}-${np.node.id}`}
                  x={np.x}
                  y={y}
                  width={np.width}
                  height={tubeHeight}
                  rx={tubeHeight / 2}
                  fill={color}
                  fillOpacity={tubeOpacity}
                />
              ))}
              {segments.slice(1).map((np, i) => {
                const prev = segments[i];
                const x1 = prev.x + prev.width;
                const x2 = np.x;
                if (x2 - x1 < 1) return null;
                const yMid = y + tubeHeight / 2;
                const cpOffset = Math.min((x2 - x1) / 2, 24);
                const d = `M ${x1} ${yMid} C ${x1 + cpOffset} ${yMid}, ${x2 - cpOffset} ${yMid}, ${x2} ${yMid}`;
                return (
                  <path
                    key={`conn-${path.name}-${i}`}
                    d={d}
                    fill="none"
                    stroke={color}
                    strokeWidth={2}
                    strokeOpacity={connectorOpacity}
                  />
                );
              })}
            </g>
          );
        })}

        <text
          x={layout.totalWidth / 2}
          y={totalHeight - 8}
          textAnchor="middle"
          fontSize={9}
          fill="#9ca3af"
        >
          {data.region} · {data.nodes.length} nodes · {data.anchorGene}
        </text>
      </svg>
      <TubeMapLegend />
    </div>
  );
}


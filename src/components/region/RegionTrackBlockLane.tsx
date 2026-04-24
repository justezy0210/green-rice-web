import { useNavigate } from 'react-router-dom';
import {
  BLOCK_MAX_ROWS,
  BLOCK_ROW_H,
  BLOCK_TOP,
  MARGIN_LEFT,
} from '@/lib/region-track-layout';
import type { CandidateBlock } from '@/types/candidate-block';

const CURATED_FILL = '#d97706'; // amber-600

/**
 * Track lane that overlays each **curated** candidate block as a
 * thin amber bar spanning its `region.start..region.end`. Auto 1 Mb
 * bin blocks are intentionally excluded from this visual overlay
 * because they are a systematic 1 Mb grid — their presence is noise,
 * not signal. The Overlapping-blocks panel below the track still
 * lists both curated and auto blocks as rows for reference.
 *
 * Same-blockId duplicates across trait runs (e.g. a curated region
 * used by 3 traits' analysis runs) collapse to a single bar so the
 * lane reads as "this locus is under curated review", not "three
 * identical bars stacked". The aggregated trait list appears in the
 * tooltip; the representative run (first curated, highest OG count)
 * is the click target.
 */
export function RegionTrackBlockLane({
  blocks,
  xOf,
  windowStart,
  windowEnd,
}: {
  blocks: CandidateBlock[];
  xOf: (pos: number) => number;
  windowStart: number;
  windowEnd: number;
}) {
  const curated = blocks.filter((b) => b.curated);
  if (curated.length === 0) return null;

  // Dedupe by blockId; collect the set of traits that share this
  // curated region + pick a representative block (highest OG count,
  // curated already filtered). Tooltip surfaces the full trait list.
  const byBlockId = new Map<string, { rep: CandidateBlock; traits: string[] }>();
  for (const b of curated) {
    const existing = byBlockId.get(b.blockId);
    if (!existing) {
      byBlockId.set(b.blockId, { rep: b, traits: [b.traitId] });
      continue;
    }
    if (!existing.traits.includes(b.traitId)) existing.traits.push(b.traitId);
    if (b.candidateOgCount > existing.rep.candidateOgCount) existing.rep = b;
  }

  // Single row (BLOCK_MAX_ROWS=1). Overlapping distinct blockIds stack
  // visually and remain discoverable via the panel below.
  const rowEnds: number[] = new Array(BLOCK_MAX_ROWS).fill(-Infinity);
  const placements = Array.from(byBlockId.values()).map(({ rep, traits }) => {
    const start = Math.max(rep.region.start, windowStart);
    const end = Math.min(rep.region.end, windowEnd);
    let row = rowEnds.findIndex((re) => re <= start);
    if (row < 0) row = BLOCK_MAX_ROWS - 1;
    rowEnds[row] = end;
    return { block: rep, traits, row, start, end };
  });

  return (
    <g>
      {placements.map(({ block, traits, row, start, end }) => (
        <BlockBar
          key={block.blockId}
          block={block}
          traits={traits}
          row={row}
          x1={xOf(start)}
          x2={xOf(end)}
        />
      ))}
    </g>
  );
}

function BlockBar({
  block,
  traits,
  row,
  x1,
  x2,
}: {
  block: CandidateBlock;
  traits: string[];
  row: number;
  x1: number;
  x2: number;
}) {
  const navigate = useNavigate();
  const width = Math.max(2, x2 - x1);
  const y = BLOCK_TOP + 1 + row * BLOCK_ROW_H;
  const onClick = () => {
    navigate(
      `/analysis/${block.runId}/block/${encodeURIComponent(block.blockId)}`,
    );
  };
  const traitSummary =
    traits.length > 1
      ? `${traits.length} traits (${traits.join(', ')})`
      : traits[0];
  return (
    <g style={{ cursor: 'pointer' }} onClick={onClick}>
      <rect
        x={x1}
        y={y}
        width={width}
        height={BLOCK_ROW_H - 1}
        fill={CURATED_FILL}
        opacity={0.85}
        rx={1}
      >
        <title>
          {block.blockId} · {traitSummary} · curated review ·{' '}
          {block.candidateOgCount} OG · {block.intersectionCount} int
          (click to open block detail)
        </title>
      </rect>
    </g>
  );
}

/** Lane label + baseline rule. Rendered once per SVG. */
export function RegionTrackBlockLaneLabel() {
  return (
    <>
      <text
        x={MARGIN_LEFT}
        y={BLOCK_TOP - 2}
        fontSize={8}
        fill="#6b7280"
      >
        blocks
      </text>
    </>
  );
}

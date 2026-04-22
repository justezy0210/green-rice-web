import { Link } from 'react-router-dom';
import { TRAITS } from '@/config/traits';
import type { CandidateBlock } from '@/types/candidate-block';

interface Props {
  /** All overlapping blocks at a region, across runs. */
  blocks: CandidateBlock[];
  /** trait of the block the user is currently viewing; rendered as the "active" row. */
  activeTraitId?: string | null;
}

/**
 * Side-by-side comparison of every trait run that has a block at the
 * same region window. Shows group counts, candidate OG count,
 * intersection count, top OGs, and a jump-to link per trait. Collapses
 * naturally into a wide row so a shared region reads as "these traits
 * converge on the same structural neighbourhood, with these
 * functional family representatives."
 */
export function CrossTraitBlockCompare({ blocks, activeTraitId }: Props) {
  if (blocks.length === 0) return null;
  const traitLabels = new Map<string, string>(TRAITS.map((t) => [t.id, t.label]));

  // Group by trait. A single trait may contribute multiple overlapping
  // blocks (e.g. an auto bin plus a curated region that covers the
  // same window). Prefer curated; fall back to the one with the most
  // candidates.
  const byTrait = new Map<string, CandidateBlock>();
  for (const b of blocks) {
    const existing = byTrait.get(b.traitId);
    if (!existing) {
      byTrait.set(b.traitId, b);
      continue;
    }
    const prefer =
      (b.curated && !existing.curated) ||
      (b.curated === existing.curated && b.candidateOgCount > existing.candidateOgCount);
    if (prefer) byTrait.set(b.traitId, b);
  }

  const rows = Array.from(byTrait.values()).sort((a, b) => {
    // Active trait first, then curated, then by candidate count.
    if (activeTraitId) {
      if (a.traitId === activeTraitId && b.traitId !== activeTraitId) return -1;
      if (b.traitId === activeTraitId && a.traitId !== activeTraitId) return 1;
    }
    if (a.curated !== b.curated) return a.curated ? -1 : 1;
    return b.candidateOgCount - a.candidateOgCount;
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm table-fixed">
        <colgroup>
          <col className="w-36" />
          <col className="w-24" />
          <col className="w-20" />
          <col className="w-20" />
          <col />
          <col className="w-20" />
        </colgroup>
        <thead>
          <tr className="text-[10px] uppercase tracking-wide text-gray-500 border-b border-gray-200">
            <th className="text-left pl-3 pr-2 py-1.5">Trait</th>
            <th className="text-left px-3 py-1.5">Groups</th>
            <th className="text-right px-3 py-1.5">Candidates</th>
            <th className="text-right px-3 py-1.5">Intersections</th>
            <th className="text-left px-3 py-1.5">Top OGs</th>
            <th className="text-left pl-3 pr-4 py-1.5">Block</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <Row
              key={`${b.runId}:${b.blockId}`}
              block={b}
              label={traitLabels.get(b.traitId) ?? b.traitId}
              active={b.traitId === activeTraitId}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({
  block,
  label,
  active,
}: {
  block: CandidateBlock;
  label: string;
  active: boolean;
}) {
  const [low, high] = block.groupLabels;
  const nLow = block.groupCounts[low] ?? 0;
  const nHigh = block.groupCounts[high] ?? 0;
  const topOgs = block.topOgIds.slice(0, 4);
  const rowClass = active
    ? 'border-b border-gray-100 bg-green-50'
    : 'border-b border-gray-100 hover:bg-gray-50';
  return (
    <tr className={rowClass}>
      <td className="pl-3 pr-2 py-1.5">
        <span className="text-[13px] text-gray-800">{label}</span>
        {block.curated && (
          <span className="ml-1.5 text-[9px] uppercase tracking-wide text-amber-800 bg-amber-50 border border-amber-200 rounded px-1 py-[1px]">
            curated
          </span>
        )}
      </td>
      <td className="px-3 py-1.5 text-[11px] text-gray-600 tabular-nums">
        <span className="font-mono">{low}</span> {nLow} ·{' '}
        <span className="font-mono">{high}</span> {nHigh}
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums text-gray-800">
        {block.candidateOgCount}
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums text-gray-800">
        {block.intersectionCount}
      </td>
      <td className="px-3 py-1.5">
        <span className="inline-flex flex-wrap gap-1">
          {topOgs.length === 0 ? (
            <span className="text-[11px] text-gray-400">—</span>
          ) : (
            topOgs.map((og) => (
              <Link
                key={og}
                to={`/og/${encodeURIComponent(og)}?trait=${block.traitId}`}
                className="text-[10px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-1 py-[1px] rounded hover:bg-indigo-100"
                onClick={(e) => e.stopPropagation()}
              >
                {og}
              </Link>
            ))
          )}
        </span>
      </td>
      <td className="pl-3 pr-4 py-1.5">
        <Link
          to={`/analysis/${block.runId}/block/${encodeURIComponent(block.blockId)}`}
          className="text-[11px] text-green-700 hover:underline"
        >
          Open →
        </Link>
      </td>
    </tr>
  );
}

import { Link } from 'react-router-dom';
import type { RunId } from '@/types/analysis-run';

interface Props {
  runId: RunId;
  blockId: string | null;
}

/**
 * Universal navigation primitive. Surfaces (candidate rows, OG detail,
 * SV rows, gene rows, region page) use this to link into the block
 * detail's ConvergentEvidenceCard instead of re-rendering the evidence
 * themselves. Shows a disabled-looking badge when the entity does not
 * belong to a materialised block (blockId = null), so the absence is
 * visible rather than silent.
 */
export function JumpToBlockChip({ runId, blockId }: Props) {
  if (!blockId) {
    return (
      <span
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-gray-200 text-[10px] text-gray-400 font-mono cursor-default"
        title="Candidate does not roll up into a materialised review block"
      >
        no block
      </span>
    );
  }
  const label = blockId.startsWith('curated_')
    ? 'curated ⭐'
    : blockId.replace(/^bin_/, '');
  return (
    <Link
      to={`/discovery/${runId}/block/${encodeURIComponent(blockId)}`}
      title={`Jump to block ${blockId}`}
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-green-200 bg-green-50 text-[10px] text-green-700 font-mono hover:bg-green-100"
    >
      → {label}
    </Link>
  );
}

import type { BlockType } from '@/types/candidate-block';

const CLASSES: Record<BlockType, string> = {
  og_sv_block: 'border-green-200 bg-green-50 text-green-700',
  sv_regulatory_block: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  cnv_block: 'border-violet-200 bg-violet-50 text-violet-700',
  shared_linked_block: 'border-amber-200 bg-amber-50 text-amber-700',
};

const LABELS: Record<BlockType, string> = {
  og_sv_block: 'OG × SV',
  sv_regulatory_block: 'Regulatory SV',
  cnv_block: 'CNV',
  shared_linked_block: 'Shared / linked',
};

export function BlockTypeBadge({ blockType }: { blockType: BlockType }) {
  return (
    <span
      className={`text-[10px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded border ${CLASSES[blockType]}`}
      title={`block-type: ${blockType}`}
    >
      {LABELS[blockType]}
    </span>
  );
}

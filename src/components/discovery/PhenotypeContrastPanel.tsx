import { Card, CardContent } from '@/components/ui/card';
import type { CandidateBlock } from '@/types/candidate-block';

export function PhenotypeContrastPanel({ block }: { block: CandidateBlock }) {
  const [a, b] = block.groupLabels;
  const nA = block.groupCounts[a] ?? 0;
  const nB = block.groupCounts[b] ?? 0;
  return (
    <Card>
      <CardContent className="py-3">
        <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-2">
          Phenotype contrast
        </h3>
        <div className="flex items-center gap-4 text-sm text-gray-700">
          <span>
            <code className="text-[11px] bg-gray-100 px-1 py-0.5 rounded">{block.traitId}</code>
          </span>
          <span className="tabular-nums">
            <strong>{nA}</strong> {a}
          </span>
          <span className="text-gray-400">vs</span>
          <span className="tabular-nums">
            <strong>{nB}</strong> {b}
          </span>
        </div>
        <p className="text-[11px] text-gray-500 mt-1">
          Proposed grouping · small-sample candidate discovery only.
        </p>
      </CardContent>
    </Card>
  );
}

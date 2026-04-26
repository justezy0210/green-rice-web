import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { useObservedInAnalyses } from '@/hooks/useObservedInAnalyses';
import type { EntityType } from '@/types/candidate';

interface Props {
  entityType: EntityType;
  entityId: string;
}

/**
 * Lists the CandidateBlocks an entity rolls up into, across runs. On OG
 * detail this is how researchers see the block-level context without
 * leaving the OG page.
 */
export function CandidateBlocksInAnalysesPanel({ entityType, entityId }: Props) {
  const { blocks, loading } = useObservedInAnalyses(entityType, entityId);
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="text-xs uppercase tracking-wide text-gray-500">
            Candidate blocks in discovery
          </h3>
          <span className="text-[10px] text-gray-400 font-mono">
            {entityType}:{entityId}
          </span>
        </div>
        {loading ? (
          <p className="text-[12px] text-gray-400">Loading blocks…</p>
        ) : blocks.length === 0 ? (
          <p className="text-[12px] text-gray-500 leading-snug">
            This entity does not currently roll up into any materialised
            review block.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 text-[12px]">
            {blocks.map((b) => {
              const region = `${b.chr}:${(b.start / 1_000_000).toFixed(1)}–${(b.end / 1_000_000).toFixed(1)} Mb`;
              return (
                <li key={`${b.runId}:${b.blockId}`} className="py-1.5">
                  <Link
                    to={`/discovery/${b.runId}/block/${encodeURIComponent(b.blockId)}`}
                    className="flex items-center justify-between gap-3 hover:text-green-700 hover:underline"
                  >
                    <span>
                      <span className="text-gray-800">{region}</span>
                      <span className="ml-2 text-gray-400 font-mono text-[10px]">
                        {b.traitId}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 text-[10px] text-gray-400">
                      {b.curated && (
                        <span className="text-amber-700 bg-amber-50 border border-amber-200 rounded px-1 py-[1px]">
                          curated
                        </span>
                      )}
                      <span className="font-mono">{b.blockId}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

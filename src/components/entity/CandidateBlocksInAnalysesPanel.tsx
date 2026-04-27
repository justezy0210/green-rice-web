import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { TRAITS } from '@/config/traits';
import { useObservedInAnalyses } from '@/hooks/useObservedInAnalyses';
import { discoveryLocusUrlForBlock } from '@/lib/discovery-locus-slugs';
import type { EntityType } from '@/types/candidate';

interface Props {
  entityType: EntityType;
  entityId: string;
}

const traitLabel = new Map<string, string>(TRAITS.map((trait) => [trait.id, trait.label]));

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
            Discovery review loci
          </h3>
        </div>
        {loading ? (
          <p className="text-[12px] text-gray-400">Loading blocks…</p>
        ) : blocks.length === 0 ? (
          <p className="text-[12px] text-gray-500 leading-snug">
            This {entityType} is not currently linked to a public Discovery
            review locus.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 text-[12px]">
            {blocks.map((b) => {
              const region = `${b.chr}:${(b.start / 1_000_000).toFixed(1)}–${(b.end / 1_000_000).toFixed(1)} Mb`;
              const locusUrl = discoveryLocusUrlForBlock(b);
              const content = (
                <>
                  <span>
                    <span className="text-gray-800">{region}</span>
                    <span className="ml-2 text-gray-500 text-[10px]">
                      {traitLabel.get(b.traitId) ?? b.traitId}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 text-[10px] text-gray-400">
                    {b.curated && (
                      <span className="text-amber-700 bg-amber-50 border border-amber-200 rounded px-1 py-[1px]">
                        curated
                      </span>
                    )}
                  </span>
                </>
              );
              return (
                <li key={`${b.runId}:${b.blockId}`} className="py-1.5">
                  {locusUrl ? (
                    <Link
                      to={locusUrl}
                      className="flex items-center justify-between gap-3 hover:text-green-700 hover:underline"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="flex items-center justify-between gap-3">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

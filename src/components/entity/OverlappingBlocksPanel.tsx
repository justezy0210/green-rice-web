import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { TRAITS } from '@/config/traits';
import { useOverlappingBlocks } from '@/hooks/useOverlappingBlocks';
import { discoveryLocusUrlForBlock } from '@/lib/discovery-locus-slugs';

interface Props {
  chr: string;
  start: number;
  end: number;
}

const traitLabel = new Map<string, string>(TRAITS.map((trait) => [trait.id, trait.label]));

/**
 * Region-page surface. Lists every CandidateBlock whose (chr, start, end)
 * overlaps the current window, across all runs. Replaces the
 * deprecated region_* exact-key reverse index.
 */
export function OverlappingBlocksPanel({ chr, start, end }: Props) {
  const { blocks, loading, error } = useOverlappingBlocks({ chr, start, end });
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="text-xs uppercase tracking-wide text-gray-500">
            Discovery review loci
          </h3>
          <span className="text-[10px] font-mono text-gray-400">
            {chr}:{start.toLocaleString()}-{end.toLocaleString()}
          </span>
        </div>
        {loading ? (
          <p className="text-[12px] text-gray-400">Scanning blocks…</p>
        ) : error ? (
          <p className="text-[12px] text-red-600">
            Could not load overlapping blocks: {error.message}
          </p>
        ) : blocks.length === 0 ? (
          <p className="text-[12px] text-gray-500">
            No candidate review blocks overlap this window.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 text-[12px]">
            {blocks.map((b) => {
              const region = `${b.region.chr}:${(b.region.start / 1_000_000).toFixed(1)}–${(b.region.end / 1_000_000).toFixed(1)} Mb`;
              const locusUrl = discoveryLocusUrlForBlock(b);
              const content = (
                <>
                  <span className="min-w-0">
                    <span className="text-gray-800">{region}</span>
                    <span className="ml-2 text-[10px] text-gray-500">
                      {traitLabel.get(b.traitId) ?? b.traitId}
                    </span>
                  </span>
                  {b.curated && (
                    <span className="flex shrink-0 items-center gap-2 text-[10px] text-gray-500">
                      <span className="text-amber-700 bg-amber-50 border border-amber-200 rounded px-1 py-[1px]">
                        curated
                      </span>
                    </span>
                  )}
                </>
              );
              return (
                <li key={`${b.runId}:${b.blockId}`}>
                  {locusUrl ? (
                    <Link
                      to={locusUrl}
                      className="flex items-center justify-between gap-3 py-2 px-1 rounded hover:bg-green-50"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="flex items-center justify-between gap-3 py-2 px-1">
                      {content}
                    </div>
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

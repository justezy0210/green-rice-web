import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { useOverlappingBlocks } from '@/hooks/useOverlappingBlocks';

interface Props {
  chr: string;
  start: number;
  end: number;
}

/**
 * Region-page surface. Lists every CandidateBlock whose (chr, start, end)
 * overlaps the current window, across all runs. Replaces the
 * deprecated region_* exact-key reverse index.
 */
export function OverlappingBlocksPanel({ chr, start, end }: Props) {
  const { blocks, loading } = useOverlappingBlocks({ chr, start, end });
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="text-xs uppercase tracking-wide text-gray-500">
            Overlapping analysis blocks
          </h3>
          <span className="text-[10px] font-mono text-gray-400">
            {chr}:{start.toLocaleString()}-{end.toLocaleString()}
          </span>
        </div>
        {loading ? (
          <p className="text-[12px] text-gray-400">Scanning blocks…</p>
        ) : blocks.length === 0 ? (
          <p className="text-[12px] text-gray-500">
            No candidate review blocks overlap this window.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 text-[12px]">
            {blocks.map((b) => {
              const region = `${b.region.chr}:${(b.region.start / 1_000_000).toFixed(1)}–${(b.region.end / 1_000_000).toFixed(1)} Mb`;
              return (
                <li key={`${b.runId}:${b.blockId}`}>
                  <Link
                    to={`/analysis/${b.runId}/block/${encodeURIComponent(b.blockId)}`}
                    className="flex items-center justify-between gap-3 py-2 px-1 rounded hover:bg-green-50"
                  >
                    <span className="min-w-0">
                      <span className="text-gray-800">{region}</span>
                      <span className="ml-2 text-[10px] font-mono text-gray-400">
                        {b.traitId}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 text-[10px] text-gray-500 shrink-0">
                      {b.curated && (
                        <span className="text-amber-700 bg-amber-50 border border-amber-200 rounded px-1 py-[1px]">
                          curated
                        </span>
                      )}
                      <span className="tabular-nums text-gray-600">
                        {b.candidateOgCount} OG · {b.intersectionCount} int
                      </span>
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

import { useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRunIntersections } from '@/hooks/useRunIntersections';
import {
  enumerateBlockExports,
  type BlockExportFile,
} from '@/lib/block-export';
import type { CandidateBlock } from '@/types/candidate-block';
import type { Candidate } from '@/types/candidate';
import type { IntersectionRow } from '@/types/intersection';

interface Props {
  block: CandidateBlock;
  candidates: Candidate[];
}

/**
 * Download buttons that materialise the block's candidate and
 * intersection rows as TSV + markdown files, matching the server-side
 * `curated_blocks/{name}/*` bundle layout.
 *
 * Intersections are filtered from the run-scoped bundle by the
 * block's region window so auto bins emit only their own rows; for
 * curated regions that span multiple 1 Mb bins, the filter picks up
 * every row inside the region.
 */
export function BlockExportPanel({ block, candidates }: Props) {
  const regionFilter = useCallback(
    (row: IntersectionRow): boolean => {
      if (row.chr !== block.region.chr) return false;
      return row.start <= block.region.end && row.end >= block.region.start;
    },
    [block.region.chr, block.region.start, block.region.end],
  );
  const { rows: intersections, loading, error } = useRunIntersections(
    block.runId,
    regionFilter,
  );

  const files = useMemo(
    () => enumerateBlockExports(block, candidates, intersections),
    [block, candidates, intersections],
  );

  return (
    <Card>
      <CardContent className="py-3">
        <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-2">
          Export bundle
        </h3>
        <p className="text-[11px] text-gray-500 mb-2 leading-snug">
          Candidate-discovery export. Not validation-grade, not causal, not
          marker-ready. Window boundaries do not imply an inferred haplotype
          (see scope.md).
        </p>
        <div className="flex flex-wrap gap-2">
          {files.map((f) => (
            <DownloadButton
              key={f.filename}
              file={f}
              disabled={f.filename.includes('intersections') && loading}
            />
          ))}
        </div>
        {error && (
          <p className="text-[11px] text-red-600 mt-2">
            Intersections failed to load: {error.message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function DownloadButton({
  file,
  disabled,
}: {
  file: BlockExportFile;
  disabled?: boolean;
}) {
  const handleClick = () => {
    const blob = new Blob([file.content], {
      type: `${file.mediaType}; charset=utf-8`,
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = file.filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    // Release the blob once the browser has had a chance to kick off
    // the download; short timeout keeps Chrome from cancelling.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <Button
      type="button"
      variant="outline"
      size="xs"
      onClick={handleClick}
      disabled={disabled}
      className="font-mono border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
    >
      {file.filename}
    </Button>
  );
}

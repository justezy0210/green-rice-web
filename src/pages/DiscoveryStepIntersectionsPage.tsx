import { useMemo } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DiscoveryShell } from '@/components/discovery/DiscoveryShell';
import { JumpToBlockChip } from '@/components/discovery/JumpToBlockChip';
import {
  discoveryTableCellClass,
  discoveryTableClass,
  discoveryTableHeaderClass,
  discoveryTableHeadRowClass,
  discoveryTableRowClass,
} from '@/components/discovery/DiscoveryTableStyles';
import { useAnalysisRun } from '@/hooks/useAnalysisRun';
import { useBlocks } from '@/hooks/useBlock';
import { useCandidates } from '@/hooks/useCandidates';
import { isValidRunId } from '@/lib/analysis-run-id';

/**
 * Step 4 minimal activation. Groups candidate rows by blockId; per-row
 * detail (SV × impact class) stays on the block detail page so the
 * convergence rendering lives in exactly one place.
 */
export function DiscoveryStepIntersectionsPage() {
  const { runId } = useParams<{ runId: string }>();
  const validRunId = runId && isValidRunId(runId) ? runId : null;
  const { run, error } = useAnalysisRun(validRunId);
  const { blocks, loading: blocksLoading } = useBlocks(validRunId);
  const { candidates, loading: candsLoading } = useCandidates(validRunId);

  const rows = useMemo(() => {
    const byBlock = new Map<string, {
      blockId: string;
      candidateCount: number;
      withSv: number;
      intersectionCount: number;
      chr: string;
      start: number;
      end: number;
      curated: boolean;
      representativeAnnotations: string[];
    }>();
    for (const b of blocks) {
      byBlock.set(b.blockId, {
        blockId: b.blockId,
        candidateCount: 0,
        withSv: 0,
        intersectionCount: b.intersectionCount,
        chr: b.region.chr,
        start: b.region.start,
        end: b.region.end,
        curated: b.curated,
        representativeAnnotations: b.representativeAnnotations.slice(0, 3),
      });
    }
    for (const c of candidates) {
      if (!c.blockId) continue;
      const row = byBlock.get(c.blockId);
      if (!row) continue;
      row.candidateCount += 1;
      if (c.bestSv) row.withSv += 1;
    }
    return Array.from(byBlock.values()).sort((a, b) => {
      if (a.curated !== b.curated) return a.curated ? -1 : 1;
      return b.intersectionCount - a.intersectionCount;
    });
  }, [blocks, candidates]);

  if (!validRunId) return <Navigate to="/discovery" replace />;
  if (error || !run) {
    return (
      <div className="py-10 text-center text-sm text-gray-500">
        {error?.message ?? 'Run not found.'}
      </div>
    );
  }

  const loading = blocksLoading || candsLoading;

  return (
    <DiscoveryShell runId={validRunId} stepAvailability={run.stepAvailability}>
      <div className="space-y-4">
        <header>
          <h1 className="text-xl font-semibold text-gray-900">
            Step 4 — Intersections
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            OG × SV overlap grouped by review block. Row click opens the
            block detail where SV × impact-class rows live under the
            Convergent Evidence card.
          </p>
        </header>

        <Card>
          <CardContent className="py-3">
            {loading ? (
              <p className="text-sm text-gray-400">Loading intersections…</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-gray-500">
                No blocks materialised for this run.
              </p>
            ) : (
              <Table density="dense" className={discoveryTableClass}>
                <colgroup>
                  <col className="w-28" />
                  <col />
                  <col className="w-20" />
                  <col className="w-20" />
                  <col className="w-24" />
                  <col className="w-32" />
                </colgroup>
                <TableHeader className={discoveryTableHeaderClass}>
                  <TableRow className={discoveryTableHeadRowClass}>
                    <TableHead className="pl-3">Region</TableHead>
                    <TableHead className="px-3">Annotations</TableHead>
                    <TableHead className="px-3 text-right">Candidates</TableHead>
                    <TableHead className="px-3 text-right">w/ SV</TableHead>
                    <TableHead className="px-3 text-right">Intersections</TableHead>
                    <TableHead className="pl-3 pr-4">Block</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const region = `${r.chr}:${(r.start / 1_000_000).toFixed(1)}–${(r.end / 1_000_000).toFixed(1)} Mb`;
                    return (
                      <TableRow key={r.blockId} className={discoveryTableRowClass}>
                        <TableCell
                          className={discoveryTableCellClass({
                            position: 'first',
                            className: 'pl-3 font-mono text-[11px]',
                          })}
                        >
                          <Link
                            to={`/discovery/${validRunId}/block/${encodeURIComponent(r.blockId)}`}
                            className="text-gray-800 hover:text-green-700"
                          >
                            {region}
                          </Link>
                        </TableCell>
                        <TableCell
                          className={discoveryTableCellClass({
                            className: 'px-3 text-[11px] text-gray-600 truncate',
                          })}
                        >
                          {r.representativeAnnotations.length > 0
                            ? r.representativeAnnotations.join(' · ')
                            : <span className="text-gray-400">none</span>}
                        </TableCell>
                        <TableCell
                          className={discoveryTableCellClass({
                            className: 'px-3 text-right tabular-nums text-[11px]',
                          })}
                        >
                          {r.candidateCount}
                        </TableCell>
                        <TableCell
                          className={discoveryTableCellClass({
                            className: 'px-3 text-right tabular-nums text-[11px]',
                          })}
                        >
                          {r.withSv}
                        </TableCell>
                        <TableCell
                          className={discoveryTableCellClass({
                            className: 'px-3 text-right tabular-nums font-medium text-gray-900',
                          })}
                        >
                          {r.intersectionCount}
                        </TableCell>
                        <TableCell
                          className={discoveryTableCellClass({
                            position: 'last',
                            className: 'pl-3 pr-4',
                          })}
                        >
                          <JumpToBlockChip runId={validRunId} blockId={r.blockId} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DiscoveryShell>
  );
}

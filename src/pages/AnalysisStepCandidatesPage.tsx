import { useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AnalysisShell } from '@/components/analysis/AnalysisShell';
import { JumpToBlockChip } from '@/components/analysis/JumpToBlockChip';
import { useAnalysisRun } from '@/hooks/useAnalysisRun';
import { useCandidates } from '@/hooks/useCandidates';
import { isValidRunId } from '@/lib/analysis-run-id';
import type { Candidate } from '@/types/candidate';

const PAGE_SIZE = 25;

export function AnalysisStepCandidatesPage() {
  const { runId } = useParams<{ runId: string }>();
  const validRunId = runId && isValidRunId(runId) ? runId : null;
  const { run, error } = useAnalysisRun(validRunId);
  const { candidates, loading } = useCandidates(validRunId);
  const [page, setPage] = useState(0);

  if (!validRunId) return <Navigate to="/analysis" replace />;
  if (error || !run) {
    return (
      <div className="py-10 text-center text-sm text-gray-500">
        {error?.message ?? 'Run not found.'}
      </div>
    );
  }

  const pages = Math.max(1, Math.ceil(candidates.length / PAGE_SIZE));
  const pageSlice = candidates.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <AnalysisShell runId={validRunId} stepAvailability={run.stepAvailability}>
      <div className="space-y-4">
        <header>
          <h1 className="text-xl font-semibold text-gray-900">
            Step 5 — Candidates
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Ranked candidate list for trait <strong>{run.traitId}</strong>.{' '}
            <code className="text-[11px] bg-gray-100 px-1 py-0.5 rounded">og_only</code>{' '}
            type from OG × trait Mann-Whitney U.
          </p>
        </header>

        <Card>
          <CardContent className="py-4">
            {loading ? (
              <p className="text-sm text-gray-400">Deriving candidates…</p>
            ) : candidates.length === 0 ? (
              <p className="text-sm text-gray-500">
                No candidates passed the p &lt; 0.05 threshold for this run.
              </p>
            ) : (
              <>
                <div className="text-xs text-gray-500 mb-2">
                  {candidates.length} candidate{candidates.length === 1 ? '' : 's'} · page{' '}
                  {page + 1} / {pages}
                </div>
                <CandidateTable runId={validRunId} candidates={pageSlice} />
                {pages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-3 text-xs">
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      ← Prev
                    </Button>
                    <span className="text-gray-500">
                      {page + 1} / {pages}
                    </span>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
                      disabled={page >= pages - 1}
                    >
                      Next →
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AnalysisShell>
  );
}

function CandidateTable({
  runId,
  candidates,
}: {
  runId: string;
  candidates: Candidate[];
}) {
  return (
    <Table density="dense" className="table-fixed">
      <colgroup>
        <col className="w-12" />
        <col className="w-28" />
        <col className="w-24" />
        <col />
        <col className="w-32" />
        <col />
        <col className="w-28" />
        <col className="w-20" />
      </colgroup>
      <TableHeader>
        <TableRow className="text-[10px] uppercase tracking-wide text-gray-500">
          <TableHead className="pl-3">Rank</TableHead>
          <TableHead className="px-3">OG</TableHead>
          <TableHead className="px-3">Type</TableHead>
          <TableHead className="px-3">OG pattern</TableHead>
          <TableHead className="px-3">Best SV</TableHead>
          <TableHead className="px-3">Function</TableHead>
          <TableHead className="px-3">Block</TableHead>
          <TableHead className="pl-3 pr-4 text-right">Score</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {candidates.map((c) => (
          <TableRow key={c.candidateId} className="hover:bg-green-50 transition-colors">
            <TableCell className="pl-3 text-gray-500 tabular-nums">{c.rank}</TableCell>
            <TableCell className="px-3">
              <Link
                to={`/analysis/${runId}/candidate/${c.candidateId}`}
                className="text-green-700 hover:underline font-mono text-[12px]"
              >
                {c.primaryOgId}
              </Link>
            </TableCell>
            <TableCell className="px-3">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 h-auto">
                {c.candidateType}
              </Badge>
            </TableCell>
            <TableCell className="px-3 text-[11px] text-gray-600 truncate">
              {c.orthogroupPatternSummary ?? '—'}
            </TableCell>
            <TableCell className="px-3 text-[11px] text-gray-600 truncate">
              {c.bestSv ? (
                <span>
                  <span className="font-mono text-[10px]">{c.bestSv.eventId}</span>{' '}
                  <span className="text-gray-400">{c.bestSv.svType}</span>
                  {c.bestSv.impactClass && (
                    <span className="text-gray-400"> · {c.bestSv.impactClass}</span>
                  )}
                </span>
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </TableCell>
            <TableCell className="px-3 text-[11px] text-gray-600 truncate">
              {c.functionSummary ?? <span className="text-gray-400">no annotation</span>}
            </TableCell>
            <TableCell className="px-3">
              <JumpToBlockChip runId={runId} blockId={c.blockId} />
            </TableCell>
            <TableCell className="pl-3 pr-4 text-right tabular-nums font-medium text-gray-900">
              {(c.combinedScore ?? c.totalScore).toFixed(3)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

import { useParams, Navigate, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { DiscoveryShell } from '@/components/discovery/DiscoveryShell';
import { useAnalysisRun } from '@/hooks/useAnalysisRun';
import { useBlocks } from '@/hooks/useBlock';
import { isValidRunId } from '@/lib/analysis-run-id';
import type { CandidateBlock } from '@/types/candidate-block';

export function DiscoveryRunPage() {
  const { runId } = useParams<{ runId: string }>();
  const validRunId = runId && isValidRunId(runId) ? runId : null;
  const { run, error } = useAnalysisRun(validRunId);
  if (!validRunId) {
    return <Navigate to="/discovery" replace />;
  }
  return <DiscoveryRunOverview runId={validRunId} run={run} error={error} />;
}

function DiscoveryRunOverview({
  runId,
  run,
  error,
}: {
  runId: string;
  run: ReturnType<typeof useAnalysisRun>['run'];
  error: ReturnType<typeof useAnalysisRun>['error'];
}) {
  const { blocks, loading: blocksLoading } = useBlocks(runId);

  if (error || !run) {
    return (
      <div className="py-10 text-center text-sm text-gray-500">
        {error?.message ?? 'Run not found.'}
      </div>
    );
  }

  const priorityBlocks = [...blocks].sort(priorityBlockSort).slice(0, 5);

  return (
    <DiscoveryShell runId={runId} stepAvailability={run.stepAvailability}>
      <div className="space-y-4">
        <header>
          <h1 className="text-xl font-semibold text-gray-900">Discovery overview</h1>
          <p className="text-sm text-gray-600 mt-1">
            Trait <strong>{run.traitId}</strong> · {run.sampleCount} samples ·
            scoring v{run.scoringVersion}
          </p>
        </header>

        <Card>
          <CardContent className="py-5 text-sm text-gray-700 space-y-1">
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">
              Summary
            </p>
            <p>
              <strong className="text-gray-900 tabular-nums">
                {run.candidateCount}
              </strong>{' '}
              candidates ·{' '}
              <strong className="text-gray-900 tabular-nums">
                {run.blockCount ?? blocks.length}
              </strong>{' '}
              review blocks · status{' '}
              <code className="text-[11px] bg-gray-100 px-1 py-0.5 rounded">{run.status}</code>
            </p>
            <p className="text-[11px] text-gray-500">
              Use the stepper on the left. Block detail brings SV, OG,
              intersection, and function evidence together.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <h2 className="text-xs uppercase tracking-wide text-gray-500 mb-2">
              Priority review blocks
            </h2>
            {blocksLoading ? (
              <p className="text-[12px] text-gray-400">Loading blocks…</p>
            ) : priorityBlocks.length === 0 ? (
              <p className="text-[12px] text-gray-500">
                No review blocks materialised for this run.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100 text-[12px]">
                {priorityBlocks.map((b) => (
                  <PriorityBlockRow key={b.blockId} runId={runId} block={b} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </DiscoveryShell>
  );
}

function priorityBlockSort(a: CandidateBlock, b: CandidateBlock): number {
  if (a.curated !== b.curated) return a.curated ? -1 : 1;
  return (b.candidateOgCount ?? 0) - (a.candidateOgCount ?? 0);
}

function PriorityBlockRow({ runId, block }: { runId: string; block: CandidateBlock }) {
  const region = `${block.region.chr}:${(block.region.start / 1_000_000).toFixed(1)}–${(block.region.end / 1_000_000).toFixed(1)} Mb`;
  return (
    <li>
      <Link
        to={`/discovery/${runId}/block/${encodeURIComponent(block.blockId)}`}
        className="flex items-center justify-between gap-3 py-2 px-1 rounded hover:bg-green-50"
      >
        <span className="min-w-0">
          <span className="text-sm text-gray-900">{region}</span>
          <span className="ml-2 text-[10px] font-mono text-gray-400">
            {block.blockId}
          </span>
        </span>
        <span className="flex items-center gap-2 text-[11px] text-gray-500 shrink-0">
          {block.curated && (
            <span className="text-amber-700 bg-amber-50 border border-amber-200 rounded px-1 py-[1px] text-[10px]">
              curated
            </span>
          )}
          <span className="tabular-nums">
            {block.candidateOgCount} OG · {block.intersectionCount} inter
          </span>
          <span className="text-green-700">Open →</span>
        </span>
      </Link>
    </li>
  );
}

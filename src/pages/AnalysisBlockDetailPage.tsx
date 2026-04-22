import { useParams, Link, Navigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { AnalysisShell } from '@/components/analysis/AnalysisShell';
import { ConvergentEvidenceCard } from '@/components/analysis/ConvergentEvidenceCard';
import { BlockCaveatStrip } from '@/components/analysis/BlockCaveatStrip';
import { BlockTypeBadge } from '@/components/analysis/BlockTypeBadge';
import { BlockNarrative } from '@/components/analysis/BlockNarrative';
import { PhenotypeContrastPanel } from '@/components/analysis/PhenotypeContrastPanel';
import { BlockCandidateTable } from '@/components/analysis/BlockCandidateTable';
import { useAnalysisRun } from '@/hooks/useAnalysisRun';
import { useBlock, useBlockCandidates } from '@/hooks/useBlock';
import { isValidRunId } from '@/lib/analysis-run-id';

export function AnalysisBlockDetailPage() {
  const { runId, blockId } = useParams<{ runId: string; blockId: string }>();
  const validRunId = runId && isValidRunId(runId) ? runId : null;
  const { run, error: runError } = useAnalysisRun(validRunId);
  const { block, loading, error: blockError } = useBlock(validRunId, blockId ?? null);
  const { candidates } = useBlockCandidates(validRunId, blockId ?? null);

  if (!validRunId) return <Navigate to="/analysis" replace />;
  if (runError || !run) {
    return (
      <div className="py-10 text-center text-sm text-gray-500">
        {runError?.message ?? 'Run not found.'}
      </div>
    );
  }

  const topOgId = candidates[0]?.primaryOgId ?? null;
  const topSvId = candidates[0]?.bestSv?.eventId ?? null;

  return (
    <AnalysisShell runId={validRunId} stepAvailability={run.stepAvailability}>
      <div className="space-y-4">
        <div className="text-sm text-gray-500">
          <Link
            to={`/analysis/${validRunId}`}
            className="hover:text-green-700 hover:underline"
          >
            ← Run overview
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-mono">{blockId}</span>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">Loading block…</p>
        ) : blockError || !block ? (
          <Card>
            <CardContent className="py-6 text-sm text-gray-500">
              Block not found in this run.
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardContent className="py-4 space-y-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h1 className="text-xl font-semibold text-gray-900">
                      {block.region.chr}:{(block.region.start / 1_000_000).toFixed(1)}–{(block.region.end / 1_000_000).toFixed(1)} Mb
                    </h1>
                    <p className="text-sm text-gray-600 mt-0.5 font-mono">{block.blockId}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <BlockTypeBadge blockType={block.blockType} />
                    {block.curated ? (
                      <span className="text-[10px] uppercase tracking-wide text-amber-800 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                        Curated review region
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-wide text-slate-600 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5">
                        Auto-aggregated 1 Mb window
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500 pt-1">
                  <span>
                    trait <strong className="text-gray-700">{block.traitId}</strong>
                  </span>
                  <span className="text-gray-300">·</span>
                  <span>
                    <strong className="text-gray-700 tabular-nums">{block.candidateOgCount}</strong> candidate OGs
                  </span>
                  <span className="text-gray-300">·</span>
                  <span>
                    <strong className="text-gray-700 tabular-nums">{block.intersectionCount}</strong> intersections
                  </span>
                  <span className="text-gray-300">·</span>
                  <span>
                    runId <code className="text-[10px] bg-gray-100 px-1 py-0.5 rounded">{block.runId}</code>
                  </span>
                  <span className="text-gray-300">·</span>
                  <span>
                    int <code className="text-[10px] bg-gray-100 px-1 py-0.5 rounded">{block.intersectionReleaseId}</code>
                  </span>
                </div>
              </CardContent>
            </Card>

            <BlockCaveatStrip />

            {block.curated && block.summaryMarkdown && (
              <Card>
                <CardContent className="py-4">
                  <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                    Curator summary
                  </h3>
                  <pre className="whitespace-pre-wrap text-[12px] text-gray-700 font-mono leading-snug">
                    {block.summaryMarkdown}
                  </pre>
                </CardContent>
              </Card>
            )}

            <BlockNarrative block={block} />

            <ConvergentEvidenceCard
              block={block}
              firstSvEventId={topSvId}
              firstOgId={topOgId}
            />

            <PhenotypeContrastPanel block={block} />

            <Card>
              <CardContent className="py-4">
                <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                  Candidates in this block
                </h3>
                <BlockCandidateTable runId={validRunId} candidates={candidates} />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AnalysisShell>
  );
}

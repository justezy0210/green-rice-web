import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { StepStatusBadge } from './StepStatusBadge';
import { decodeRunId } from '@/lib/analysis-run-id';
import type { AnalysisStepKey, AnalysisStepStatus, RunId } from '@/types/analysis-run';

interface Props {
  runId: RunId;
  stepAvailability: Record<AnalysisStepKey, AnalysisStepStatus>;
  children: ReactNode;
}

const STEPS: Array<{ key: AnalysisStepKey; label: string; slug: string }> = [
  { key: 'phenotype', label: '1. Phenotype', slug: 'phenotype' },
  { key: 'orthogroups', label: '2. Orthogroups', slug: 'orthogroups' },
  { key: 'variants', label: '3. Variants', slug: 'variants' },
  { key: 'intersections', label: '4. Intersections', slug: 'intersections' },
  { key: 'candidates', label: '5. Candidates', slug: 'candidates' },
];

export function AnalysisShell({ runId, stepAvailability, children }: Props) {
  const { pathname } = useLocation();
  const parts = decodeRunId(runId);

  return (
    <div className="grid grid-cols-[220px_1fr] gap-6">
      <aside className="space-y-4">
        <div className="rounded border border-gray-200 bg-white p-3">
          <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
            Run
          </div>
          <div className="font-mono text-[11px] break-all text-gray-800">
            {runId}
          </div>
          {parts && (
            <dl className="mt-2 text-[10px] text-gray-500 space-y-0.5">
              <div>
                <dt className="inline">Trait:</dt>{' '}
                <dd className="inline text-gray-700">{parts.traitId}</dd>
              </div>
              <div>
                <dt className="inline">Grouping v:</dt>{' '}
                <dd className="inline text-gray-700">{parts.groupingVersion}</dd>
              </div>
              <div>
                <dt className="inline">OrthoFinder v:</dt>{' '}
                <dd className="inline text-gray-700">{parts.orthofinderVersion}</dd>
              </div>
              <div>
                <dt className="inline">SV release v:</dt>{' '}
                <dd className="inline text-gray-700">{parts.svReleaseVersion}</dd>
              </div>
              <div>
                <dt className="inline">Gene model v:</dt>{' '}
                <dd className="inline text-gray-700">{parts.geneModelVersion}</dd>
              </div>
              <div>
                <dt className="inline">Scoring v:</dt>{' '}
                <dd className="inline text-gray-700">{parts.scoringVersion}</dd>
              </div>
            </dl>
          )}
        </div>
        <nav className="space-y-0.5">
          {STEPS.map((step) => {
            const to = `/analysis/${runId}/${step.slug}`;
            const active = pathname === to;
            const status = stepAvailability[step.key];
            const disabled = status === 'disabled';
            return disabled ? (
              <div
                key={step.key}
                className="flex items-center justify-between px-2 py-1.5 rounded text-[13px] text-gray-400 cursor-not-allowed"
                title="Step not available on this run"
              >
                <span>{step.label}</span>
                <StepStatusBadge status={status} />
              </div>
            ) : (
              <Link
                key={step.key}
                to={to}
                className={cn(
                  'flex items-center justify-between px-2 py-1.5 rounded text-[13px] transition-colors',
                  active
                    ? 'bg-green-50 text-green-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100',
                )}
              >
                <span>{step.label}</span>
                <StepStatusBadge status={status} />
              </Link>
            );
          })}
        </nav>
        <div className="pt-2 border-t border-gray-100">
          <Link
            to={`/analysis/${runId}/blocks`}
            className={cn(
              'flex items-center justify-between px-2 py-1.5 rounded text-[13px] transition-colors',
              pathname === `/analysis/${runId}/blocks`
                ? 'bg-amber-50 text-amber-800 font-medium'
                : 'text-amber-700 hover:bg-amber-50',
            )}
          >
            <span>Review blocks</span>
            <span className="text-[9px] font-mono uppercase tracking-wide">block</span>
          </Link>
        </div>
      </aside>
      <section className="min-w-0">{children}</section>
    </div>
  );
}

import { useMemo } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { ScopeStrip } from '@/components/common/ScopeStrip';
import { GroupingSummaryCard } from '@/components/explore/GroupingSummaryCard';
import { AnalysisShell } from '@/components/analysis/AnalysisShell';
import { useAnalysisRun } from '@/hooks/useAnalysisRun';
import { useOrthogroupDiff } from '@/hooks/useOrthogroupDiff';
import { useCultivars } from '@/hooks/useCultivars';
import { isValidRunId, decodeRunId } from '@/lib/analysis-run-id';

export function AnalysisStepPhenotypePage() {
  const { runId } = useParams<{ runId: string }>();
  const validRunId = runId && isValidRunId(runId) ? runId : null;
  const parts = validRunId ? decodeRunId(validRunId) : null;
  const traitId = parts?.traitId ?? null;

  const { run, error } = useAnalysisRun(validRunId);
  const { groupingDoc } = useOrthogroupDiff(traitId);
  const { cultivars } = useCultivars();

  const cultivarNameMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of cultivars) m[c.id] = c.name;
    return m;
  }, [cultivars]);

  const balance = useMemo(() => {
    if (!groupingDoc) return null;
    const byLabel: Record<string, { total: number; high: number; borderline: number }> = {};
    for (const a of Object.values(groupingDoc.assignments)) {
      const entry = byLabel[a.groupLabel] ?? { total: 0, high: 0, borderline: 0 };
      entry.total += 1;
      if (a.borderline) entry.borderline += 1;
      else if (a.confidence === 'high') entry.high += 1;
      byLabel[a.groupLabel] = entry;
    }
    return byLabel;
  }, [groupingDoc]);

  if (!validRunId) return <Navigate to="/analysis" replace />;
  if (error || !run) {
    return (
      <div className="py-10 text-center text-sm text-gray-500">
        {error?.message ?? 'Run not found.'}
      </div>
    );
  }

  return (
    <AnalysisShell runId={validRunId} stepAvailability={run.stepAvailability}>
      <div className="space-y-4">
        <header>
          <h1 className="text-xl font-semibold text-gray-900">
            Step 1 — Phenotype
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Proposed phenotype grouping for <strong>{run.traitId}</strong> over
            the {run.sampleCount}-cultivar panel. GMM auto-grouping. Candidate
            discovery only — not a validated association signal.
          </p>
        </header>

        <ScopeStrip>
          Small-sample candidate discovery. {run.sampleCount} cultivars cannot
          support GWAS-grade multiple-testing control. Landrace / improved /
          geographic substructure may overlap with phenotype groups; permutation
          null and population-structure QC are not yet applied.
        </ScopeStrip>

        <GroupingSummaryCard
          groupingDoc={groupingDoc}
          cultivarNameMap={cultivarNameMap}
        />

        {balance && (
          <Card>
            <CardContent className="py-4">
              <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                Group balance
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide text-gray-500 border-b border-gray-200">
                    <th className="text-left px-2 py-1.5">Group</th>
                    <th className="text-right px-2 py-1.5">Cultivars</th>
                    <th className="text-right px-2 py-1.5">High confidence</th>
                    <th className="text-right px-2 py-1.5">Borderline</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(balance).map(([label, b]) => (
                    <tr key={label} className="border-b border-gray-100">
                      <td className="px-2 py-1.5 font-medium text-gray-800">{label}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{b.total}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{b.high}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-amber-700">{b.borderline}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </AnalysisShell>
  );
}

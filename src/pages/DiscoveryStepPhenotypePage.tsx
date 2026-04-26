import { useMemo } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScopeStrip } from '@/components/common/ScopeStrip';
import { GroupingSummaryCard } from '@/components/explore/GroupingSummaryCard';
import { DiscoveryShell } from '@/components/discovery/DiscoveryShell';
import {
  discoveryTableCellClass,
  discoveryTableClass,
  discoveryTableHeaderClass,
  discoveryTableHeadRowClass,
  discoveryTableRowClass,
} from '@/components/discovery/DiscoveryTableStyles';
import { useAnalysisRun } from '@/hooks/useAnalysisRun';
import { useOrthogroupDiff } from '@/hooks/useOrthogroupDiff';
import { useCultivars } from '@/hooks/useCultivars';
import { isValidRunId, decodeRunId } from '@/lib/analysis-run-id';

export function DiscoveryStepPhenotypePage() {
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

  if (!validRunId) return <Navigate to="/discovery" replace />;
  if (error || !run) {
    return (
      <div className="py-10 text-center text-sm text-gray-500">
        {error?.message ?? 'Run not found.'}
      </div>
    );
  }

  return (
    <DiscoveryShell runId={validRunId} stepAvailability={run.stepAvailability}>
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
              <Table density="dense" className={discoveryTableClass}>
                <TableHeader className={discoveryTableHeaderClass}>
                  <TableRow className={discoveryTableHeadRowClass}>
                    <TableHead className="px-2">Group</TableHead>
                    <TableHead className="px-2 text-right">Cultivars</TableHead>
                    <TableHead className="px-2 text-right">High confidence</TableHead>
                    <TableHead className="px-2 text-right">Borderline</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(balance).map(([label, b]) => (
                    <TableRow key={label} className={discoveryTableRowClass}>
                      <TableCell
                        className={discoveryTableCellClass({
                          position: 'first',
                          className: 'px-2 font-medium text-gray-800',
                        })}
                      >
                        {label}
                      </TableCell>
                      <TableCell
                        className={discoveryTableCellClass({
                          className: 'px-2 text-right tabular-nums',
                        })}
                      >
                        {b.total}
                      </TableCell>
                      <TableCell
                        className={discoveryTableCellClass({
                          className: 'px-2 text-right tabular-nums',
                        })}
                      >
                        {b.high}
                      </TableCell>
                      <TableCell
                        className={discoveryTableCellClass({
                          position: 'last',
                          className: 'px-2 text-right tabular-nums text-amber-700',
                        })}
                      >
                        {b.borderline}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </DiscoveryShell>
  );
}

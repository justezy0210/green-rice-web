import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { GroupingDocument } from '@/types/grouping';

interface Props {
  groupingDoc: GroupingDocument | null;
}

export function GroupingSummaryCard({ groupingDoc }: Props) {
  if (!groupingDoc) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-gray-400 text-center">
          Grouping not yet computed for this trait.
        </CardContent>
      </Card>
    );
  }

  const { summary, quality, assignments } = groupingDoc;

  if (summary.method === 'none' || !quality.usable) {
    return (
      <Card>
        <CardContent className="py-4 text-sm text-amber-700 bg-amber-50">
          Grouping not available: {quality.note}
        </CardContent>
      </Card>
    );
  }

  const countsByLabel: Record<string, number> = {};
  let borderline = 0;
  for (const a of Object.values(assignments)) {
    if (a.borderline) borderline++;
    else countsByLabel[a.groupLabel] = (countsByLabel[a.groupLabel] ?? 0) + 1;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          Grouping
          <MethodBadge method={summary.method} />
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-gray-600 space-y-1.5">
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          {Object.entries(countsByLabel).map(([lbl, n]) => (
            <span key={lbl}>
              <strong className="text-gray-900">{lbl}</strong>: {n} cultivars
            </span>
          ))}
          {borderline > 0 && (
            <span className="text-gray-500">Borderline: {borderline}</span>
          )}
        </div>
        <div className="text-gray-400">
          {summary.scoreMetric !== 'none' && (
            <>
              {summary.scoreMetric}: {summary.scoreValue.toFixed(3)} ·{' '}
            </>
          )}
          {quality.nUsedInModel} of {quality.nObserved} cultivars used
        </div>
      </CardContent>
    </Card>
  );
}

function MethodBadge({ method }: { method: string }) {
  const cls =
    method === 'gmm'
      ? 'bg-violet-50 text-violet-700 border-violet-200'
      : 'bg-teal-50 text-teal-700 border-teal-200';
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${cls}`}>
      {method}
    </span>
  );
}

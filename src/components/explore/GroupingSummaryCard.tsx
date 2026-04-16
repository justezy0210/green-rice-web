import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buildGroupColorMap } from '@/components/dashboard/distribution-helpers';
import type { GroupingDocument } from '@/types/grouping';

interface Props {
  groupingDoc: GroupingDocument | null;
  /** cultivarId → display name */
  cultivarNameMap?: Record<string, string>;
  className?: string;
}

/** Full card variant — used standalone. */
export function GroupingSummaryCard(props: Props) {
  const cardCls = ['h-full', props.className].filter(Boolean).join(' ');
  return (
    <Card className={cardCls}>
      <GroupingSummaryBody groupingDoc={props.groupingDoc} cultivarNameMap={props.cultivarNameMap} />
    </Card>
  );
}

/** Content-only variant — embed inside a larger Card alongside other sections. */
export function GroupingSummaryBody({
  groupingDoc,
  cultivarNameMap,
}: Pick<Props, 'groupingDoc' | 'cultivarNameMap'>) {
  if (!groupingDoc) {
    return (
      <CardContent className="py-6 text-sm text-gray-400 text-center">
        Grouping not yet computed for this trait.
      </CardContent>
    );
  }

  const { summary, quality, assignments } = groupingDoc;

  if (summary.method === 'none' || !quality.usable) {
    return (
      <CardContent className="py-4 text-sm text-amber-700 bg-amber-50">
        Grouping not available: {quality.note}
      </CardContent>
    );
  }

  const byLabel: Record<string, string[]> = {};
  const borderlineIds: string[] = [];
  for (const [cid, a] of Object.entries(assignments)) {
    if (a.borderline) borderlineIds.push(cid);
    else {
      if (!byLabel[a.groupLabel]) byLabel[a.groupLabel] = [];
      byLabel[a.groupLabel].push(cid);
    }
  }
  const colorMap = buildGroupColorMap(assignments);
  const orderedLabels = Object.keys(byLabel).sort((a, b) => {
    const meanA = mean(byLabel[a].map((id) => assignments[id].indexScore));
    const meanB = mean(byLabel[b].map((id) => assignments[id].indexScore));
    return meanA - meanB;
  });

  const displayName = (cid: string) => cultivarNameMap?.[cid] ?? cid;

  return (
    <>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          Grouping
          <MethodBadge method={summary.method} />
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-gray-600 space-y-2">
        <ul className="space-y-1.5">
          {orderedLabels.map((lbl) => {
            const color = colorMap[lbl];
            const ids = byLabel[lbl];
            return (
              <li key={lbl} className="flex items-start gap-2">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-sm border mt-0.5 shrink-0"
                  style={{
                    backgroundColor: color?.bg ?? 'transparent',
                    borderColor: color?.border ?? '#e5e7eb',
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <strong className="text-gray-900">{lbl}</strong>
                    <span className="text-gray-400">({ids.length})</span>
                  </div>
                  <div className="text-gray-600 leading-snug">
                    {ids.map(displayName).sort().join(', ')}
                  </div>
                </div>
              </li>
            );
          })}
          {borderlineIds.length > 0 && (
            <li className="flex items-start gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-sm border border-gray-300 bg-gray-100 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <strong className="text-gray-700">Borderline</strong>
                  <span className="text-gray-400">({borderlineIds.length})</span>
                </div>
                <div className="text-gray-500 leading-snug">
                  {borderlineIds.map(displayName).sort().join(', ')}
                </div>
              </div>
            </li>
          )}
        </ul>
        <div className="text-[11px] text-gray-400 border-t border-gray-100 pt-1.5">
          {summary.scoreMetric !== 'none' && (
            <>
              {summary.scoreMetric}: {summary.scoreValue.toFixed(3)} ·{' '}
            </>
          )}
          {quality.nUsedInModel} of {quality.nObserved} cultivars used
        </div>
      </CardContent>
    </>
  );
}

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
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

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAllGroupings } from '@/hooks/useAllGroupings';
import type { PhenotypeRecord } from '@/types/phenotype';
import type { TraitId } from '@/types/grouping';
import { TRAITS } from '@/config/traits';
import { cn } from '@/lib/utils';

interface Props {
  records: PhenotypeRecord[];
}

// Display order + label read from the trait registry SSOT.
const TRAIT_DISPLAY = TRAITS.map((t) => ({ traitId: t.id as TraitId, label: t.label }));

export function TraitQualityOverview({ records }: Props) {
  const { groupings, loading } = useAllGroupings();
  const totalCultivars = records.length;

  const rows = useMemo(() => {
    return TRAIT_DISPLAY.map(({ traitId, label }) => {
      const doc = groupings[traitId];
      if (!doc) {
        return {
          traitId,
          label,
          nObserved: 0,
          assigned: 0,
          borderlineCount: 0,
          total: totalCultivars,
          usable: false,
          method: 'none' as const,
          note: 'No data',
        };
      }
      const { summary, quality, assignments } = doc;
      const allAssignments = Object.values(assignments);
      const borderlineCount = allAssignments.filter((a) => a.borderline).length;
      const assigned = allAssignments.length - borderlineCount;
      return {
        traitId,
        label,
        nObserved: quality.nObserved,
        assigned,
        borderlineCount,
        total: totalCultivars,
        usable: quality.usable,
        method: summary.method,
        note: quality.note,
      };
    });
  }, [groupings, totalCultivars]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Trait Quality</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : (
          <div className="space-y-2.5">
            {rows.map((row) => (
              <TraitRow key={row.traitId} row={row} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface TraitRowProps {
  row: {
    label: string;
    nObserved: number;
    assigned: number;
    borderlineCount: number;
    total: number;
    usable: boolean;
    method: 'gmm' | 'fixed-class' | 'none';
    note: string;
  };
}

function TraitRow({ row }: TraitRowProps) {
  // When usable: show confidently-grouped count (non-borderline).
  // When not usable: show observed count (data present but cannot group).
  const shownCount = row.usable ? row.assigned : row.nObserved;
  const pct = row.total > 0 ? (shownCount / row.total) * 100 : 0;
  const borderlinePct = row.total > 0 ? (row.borderlineCount / row.total) * 100 : 0;

  const methodBadge =
    row.method === 'gmm'
      ? {
          text: 'GMM-proposed',
          cls: 'bg-violet-50 text-violet-700 border-violet-200',
          title:
            'Groupings proposed by a Gaussian mixture model. Not a biological truth — a starting point for discovery.',
        }
      : row.method === 'fixed-class'
      ? {
          text: 'fixed class',
          cls: 'bg-teal-50 text-teal-700 border-teal-200',
          title: 'Groupings defined by a fixed classification in the source data.',
        }
      : null;

  const countTitle = row.usable && row.borderlineCount > 0
    ? `${row.assigned} grouped + ${row.borderlineCount} borderline (of ${row.nObserved} observed)`
    : `${shownCount} of ${row.total} cultivars`;

  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-medium text-gray-700 truncate">{row.label}</span>
        <span className="text-gray-500 tabular-nums ml-2 whitespace-nowrap" title={countTitle}>
          {shownCount}/{row.total}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-100 rounded overflow-hidden flex">
          <div
            className={cn(
              'h-full transition-all',
              row.usable ? 'bg-green-400' : pct > 0 ? 'bg-amber-300' : 'bg-gray-300',
            )}
            style={{ width: `${pct}%` }}
          />
          {row.usable && row.borderlineCount > 0 && (
            <div
              className="h-full bg-gray-300 transition-all"
              style={{ width: `${borderlinePct}%` }}
              title={`${row.borderlineCount} borderline`}
            />
          )}
        </div>
        {row.usable && methodBadge ? (
          <span
            className={cn('px-1.5 py-0.5 rounded border font-medium text-[10px] whitespace-nowrap shrink-0', methodBadge.cls)}
            title={methodBadge.title}
          >
            {methodBadge.text}
          </span>
        ) : (
          <span className="text-[10px] text-gray-400 italic whitespace-nowrap shrink-0" title={row.note}>
            not groupable
          </span>
        )}
      </div>
    </div>
  );
}

import { Card, CardContent } from '@/components/ui/card';
import { TRAITS } from '@/config/traits';
import type { SvEventTraitPattern } from '@/hooks/useSvEvent';
import type { SvGroupFreq } from '@/types/sv-event';

const traitLabel = new Map<string, string>(TRAITS.map((trait) => [trait.id, trait.label]));

interface Props {
  rows: SvEventTraitPattern[];
  loading: boolean;
  error: Error | null;
  eventId: string;
}

export function SvTraitGroupPattern({
  rows,
  loading,
  error,
  eventId,
}: Props) {
  const visibleRows = rows.slice(0, 8);

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-xs uppercase tracking-wide text-gray-500">
              Trait group pattern
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              ALT frequency difference by available trait groupings.
            </p>
          </div>
          {!loading && rows.length > 0 && (
            <span className="text-[10px] text-gray-400">
              showing {visibleRows.length} of {rows.length}
            </span>
          )}
        </div>

        {loading && <p className="text-sm text-gray-400">Loading trait group frequencies...</p>}
        {error && <p className="text-sm text-red-500">{error.message}</p>}
        {!loading && rows.length === 0 && (
          <p className="text-sm text-gray-500">
            No trait group-frequency rows are available for this SV event.
          </p>
        )}

        {visibleRows.length > 0 && (
          <div className="space-y-2">
            {visibleRows.map((row) => (
              <article
                key={row.traitId}
                className="grid grid-cols-1 gap-3 rounded-md border border-gray-100 bg-white p-3 lg:grid-cols-[minmax(160px,220px)_1fr]"
              >
                <div className="min-w-0">
                  <span
                    className="block truncate text-sm font-medium text-gray-900"
                    title={row.traitId}
                  >
                    {traitLabel.get(row.traitId) ?? row.traitId}
                  </span>
                  <div className="mt-1 font-mono text-[11px] text-gray-400">
                    {row.traitId}
                  </div>
                  <div className="mt-2 text-xs text-gray-600">
                    |ΔAF|{' '}
                    <span className="font-mono font-medium text-gray-900">
                      {row.spread === null ? 'n/a' : row.spread.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="min-w-0 space-y-2">
                  {row.groups.map((group, index) => (
                    <GroupBar
                      key={`${eventId}:${row.traitId}:${group.label}`}
                      label={group.label}
                      freq={group.freq}
                      toneIndex={index}
                    />
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function GroupBar({
  label,
  freq,
  toneIndex,
}: {
  label: string;
  freq: SvGroupFreq | null;
  toneIndex: number;
}) {
  const pct = freq ? Math.round(freq.freq * 100) : null;
  const width = pct === null ? 0 : Math.max(0, Math.min(100, pct));

  return (
    <div className="grid grid-cols-[minmax(96px,150px)_1fr_minmax(68px,88px)] items-center gap-2 text-xs">
      <div className="min-w-0 truncate text-gray-600" title={label}>
        {label}
      </div>
      <div className="h-2 overflow-hidden rounded bg-gray-100">
        <div className={`h-full rounded ${barTone(toneIndex)}`} style={{ width: `${width}%` }} />
      </div>
      <div className="text-right font-mono text-[11px] text-gray-600">
        {freq ? `${pct}% ${freq.alt}/${freq.total}` : 'n/a'}
      </div>
    </div>
  );
}

function barTone(index: number): string {
  if (index % 3 === 0) return 'bg-green-600';
  if (index % 3 === 1) return 'bg-amber-500';
  return 'bg-sky-500';
}

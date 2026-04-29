import { Link } from 'react-router-dom';
import { svGenotypeState } from '@/lib/sv-event-helpers';
import type { SvEvent } from '@/types/sv-event';

interface Props {
  eventId: string;
  event: SvEvent | null;
  loading: boolean;
  error: Error | null;
  cultivarId: string | null;
  cultivarName: string | null;
  drawnInContextView: boolean;
}

export function LinkedSvContext({
  eventId,
  event,
  loading,
  error,
  cultivarId,
  cultivarName,
  drawnInContextView,
}: Props) {
  const gt = cultivarId && event ? event.gts[cultivarId] ?? '.' : '.';
  const state = event ? svGenotypeState(gt) : null;

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-900">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium">Linked SV context</span>
        <Link
          to={`/sv/${encodeURIComponent(eventId)}`}
          className="font-mono text-green-700 hover:underline"
        >
          {eventId}
        </Link>
      </div>
      {loading ? (
        <p className="mt-1 text-amber-800">Checking carrier state...</p>
      ) : error ? (
        <p className="mt-1 text-red-600">{error.message}</p>
      ) : !event ? (
        <p className="mt-1 text-amber-800">This linked SV was not found in the current matrix.</p>
      ) : state === 'alt' ? (
        <p className="mt-1">
          {cultivarName ?? cultivarId ?? 'This cultivar'} carries the ALT allele
          for this linked SV (GT <span className="font-mono">{gt}</span>).
          {drawnInContextView
            ? ' The event falls inside this gene-centered window and is highlighted below.'
            : ' The event is linked to this record, but its cultivar coordinate is outside this gene-centered window.'}
        </p>
      ) : (
        <p className="mt-1">
          {cultivarName ?? cultivarId ?? 'This cultivar'} is{' '}
          {state === 'missing' ? 'missing' : 'REF'} for this linked SV
          (GT <span className="font-mono">{gt}</span>). A group-level AF or
          |ΔAF| signal can therefore exist while this cultivar-specific context
          view shows no ALT overlay.
        </p>
      )}
    </div>
  );
}

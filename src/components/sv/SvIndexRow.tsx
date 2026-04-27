import { Link, useNavigate } from 'react-router-dom';
import { TableCell, TableRow } from '@/components/ui/table';
import { formatBp } from '@/lib/region-helpers';
import { formatSvCoordinate } from '@/lib/sv-event-helpers';
import type { SvBrowseRow } from '@/lib/sv-browse';
import type { SvType } from '@/types/sv-event';

interface Props {
  row: SvBrowseRow;
  sampleCount: number;
}

export function SvIndexRow({ row, sampleCount }: Props) {
  const navigate = useNavigate();
  const event = row.event;
  const href = `/sv/${encodeURIComponent(event.eventId)}`;
  const openDetail = () => navigate(href);
  return (
    <TableRow
      role="link"
      tabIndex={0}
      onClick={openDetail}
      onKeyDown={(eventKey) => {
        if (eventKey.key === 'Enter' || eventKey.key === ' ') {
          eventKey.preventDefault();
          openDetail();
        }
      }}
      className="group cursor-pointer border-0 hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
    >
      <TableCell className="rounded-l-md border-y border-l border-gray-100 bg-white pl-3 group-hover:bg-green-50/50">
        <Link
          to={href}
          onClick={(clickEvent) => clickEvent.stopPropagation()}
          className="font-mono text-[12px] font-medium text-green-700 hover:underline"
        >
          {event.eventId}
        </Link>
      </TableCell>
      <TableCell className="border-y border-gray-100 bg-white group-hover:bg-green-50/50">
        <span className={typeBadgeClass(event.svType)}>{event.svType}</span>
      </TableCell>
      <TableCell className="border-y border-gray-100 bg-white font-mono text-[11px] text-gray-700 group-hover:bg-green-50/50">
        {formatSvCoordinate(event)}
      </TableCell>
      <TableCell className="border-y border-gray-100 bg-white text-right font-mono text-[11px] text-gray-700 group-hover:bg-green-50/50">
        {formatBp(event.svLenAbs)}
      </TableCell>
      <TableCell className="border-y border-gray-100 bg-white text-right font-mono text-[11px] text-gray-700 group-hover:bg-green-50/50">
        {row.altCount}/{sampleCount}
      </TableCell>
      <TableCell className="border-y border-gray-100 bg-white text-right font-mono text-[11px] text-gray-500 group-hover:bg-green-50/50">
        {row.missingCount}
      </TableCell>
      <TableCell className="rounded-r-md border-y border-r border-gray-100 bg-white group-hover:bg-green-50/50">
        <span className="block truncate font-mono text-[10px] text-gray-500" title={event.originalId}>
          {event.originalId || 'n/a'}
        </span>
      </TableCell>
    </TableRow>
  );
}

function typeBadgeClass(type: SvType): string {
  const base = 'inline-flex rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium';
  if (type === 'INS') return `${base} border-green-200 bg-green-50 text-green-800`;
  if (type === 'DEL') return `${base} border-red-200 bg-red-50 text-red-800`;
  return `${base} border-slate-200 bg-slate-50 text-slate-700`;
}

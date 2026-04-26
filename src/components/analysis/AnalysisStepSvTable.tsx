import { Link } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { SvEvent } from '@/types/sv-event';

export interface RankedSvRow {
  event: SvEvent;
  freqA: number | null;
  freqB: number | null;
  groupALabel: string | null;
  groupBLabel: string | null;
  absDeltaAf: number;
}

interface Props {
  rows: RankedSvRow[];
  cultivar: string;
}

export function AnalysisStepSvTable({ rows }: Props) {
  return (
    <Table density="dense" className="table-fixed">
      <colgroup>
        <col className="w-20" />
        <col className="w-16" />
        <col className="w-20" />
        <col className="w-20" />
        <col />
        <col />
        <col className="w-20" />
      </colgroup>
      <TableHeader>
        <TableRow className="text-[10px] uppercase tracking-wide text-gray-500">
          <TableHead className="pl-3">Chr</TableHead>
          <TableHead className="px-3">Type</TableHead>
          <TableHead className="px-3 text-right">Pos</TableHead>
          <TableHead className="px-3 text-right">|svLen|</TableHead>
          <TableHead className="px-3">Group A freq</TableHead>
          <TableHead className="px-3">Group B freq</TableHead>
          <TableHead className="pl-3 pr-4 text-right">|ΔAF|</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ event, freqA, freqB, groupALabel, groupBLabel, absDeltaAf }) => {
          const regionStart = Math.max(0, event.pos - 2000);
          const regionEnd = event.pos + Math.max(event.refLen, event.altLen) + 2000;
          const regionLink = `/region/baegilmi/${event.chr}/${regionStart}-${regionEnd}`;
          return (
            <TableRow key={event.eventId} className="hover:bg-green-50 transition-colors">
              <TableCell className="pl-3 text-gray-700 font-mono text-[11px]">
                <Link to={regionLink} className="hover:underline hover:text-green-700">
                  {event.chr}
                </Link>
              </TableCell>
              <TableCell className="px-3">
                <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0.5 h-auto">
                  {event.svType}
                </Badge>
              </TableCell>
              <TableCell className="px-3 text-right tabular-nums text-[11px] text-gray-600">
                {event.pos.toLocaleString()}
              </TableCell>
              <TableCell className="px-3 text-right tabular-nums text-[11px] text-gray-600">
                {event.svLenAbs.toLocaleString()}
              </TableCell>
              <TableCell className="px-3 text-[11px] text-gray-600">
                {groupALabel && freqA !== null ? (
                  <>
                    <span className="text-gray-400">{groupALabel}: </span>
                    <span className="tabular-nums">{freqA.toFixed(2)}</span>
                  </>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </TableCell>
              <TableCell className="px-3 text-[11px] text-gray-600">
                {groupBLabel && freqB !== null ? (
                  <>
                    <span className="text-gray-400">{groupBLabel}: </span>
                    <span className="tabular-nums">{freqB.toFixed(2)}</span>
                  </>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </TableCell>
              <TableCell className="pl-3 pr-4 text-right tabular-nums font-medium text-gray-900">
                {freqA !== null && freqB !== null ? absDeltaAf.toFixed(2) : '—'}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

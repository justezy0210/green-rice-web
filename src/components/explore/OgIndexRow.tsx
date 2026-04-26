import { Link } from 'react-router-dom';
import { TableCell, TableRow } from '@/components/ui/table';
import { TierBadge } from '@/components/badges/TierBadge';
import type { ConservationTier } from '@/lib/og-conservation';
import type { OgIndexRow as OgIndexRowData } from '@/lib/og-index-service';

const TRAIT_ABBR: Record<string, string> = {
  heading_date: 'HD', culm_length: 'CL', panicle_length: 'PL',
  panicle_number: 'PN', spikelets_per_panicle: 'SPP', ripening_rate: 'RR',
  grain_weight: 'GW', pre_harvest_sprouting: 'PHS', bacterial_leaf_blight: 'BLB',
};

interface Props {
  row: OgIndexRowData;
  panelTotal: number;
  href: string;
  onClick: () => void;
}

export function OgIndexRow({ row, panelTotal, href, onClick }: Props) {
  const tier = row.tier as ConservationTier;
  return (
    <TableRow
      onClick={onClick}
      className="group cursor-pointer border-0 hover:bg-transparent"
    >
      <TableCell className="rounded-l-md border-y border-l border-gray-100 bg-white pl-3 group-hover:bg-green-50/50">
        <Link
          to={href}
          onClick={(e) => e.stopPropagation()}
          className="font-mono text-[12px] text-gray-900 hover:text-green-700 hover:underline"
        >
          {row.ogId}
        </Link>
      </TableCell>
      <TableCell className="border-y border-gray-100 bg-white group-hover:bg-green-50/50">
        <TierBadge tier={tier} />
      </TableCell>
      <TableCell className="border-y border-gray-100 bg-white text-right tabular-nums text-[12px] text-gray-700 group-hover:bg-green-50/50">
        {row.presentCount}/{panelTotal}
      </TableCell>
      <TableCell className="border-y border-gray-100 bg-white text-right tabular-nums text-[12px] text-gray-700 group-hover:bg-green-50/50">
        {row.irgspCopyCount === 0 ? <span className="text-gray-400">×</span> : `×${row.irgspCopyCount}`}
      </TableCell>
      <TableCell className="border-y border-gray-100 bg-white text-right tabular-nums text-[12px] text-gray-700 group-hover:bg-green-50/50">
        {row.memberCount}
      </TableCell>
      <TableCell className="rounded-r-md border-y border-r border-gray-100 bg-white group-hover:bg-green-50/50">
        {row.traits && row.traits.length > 0 ? (
          <span className="inline-flex flex-wrap gap-1">
            {row.traits.slice(0, 5).map((t) => (
              <span
                key={t}
                className="text-[10px] font-mono border border-amber-200 bg-amber-50 text-amber-800 rounded px-1 py-[1px]"
                title={t}
              >
                {TRAIT_ABBR[t] ?? t.slice(0, 3).toUpperCase()}
              </span>
            ))}
            {row.traits.length > 5 && (
              <span className="text-[10px] text-gray-400">+{row.traits.length - 5}</span>
            )}
            {row.bestTraitP !== undefined && (
              <span className="text-[10px] text-gray-500 tabular-nums">
                p={row.bestTraitP < 1e-4 ? row.bestTraitP.toExponential(1) : row.bestTraitP.toFixed(3)}
              </span>
            )}
          </span>
        ) : (
          <span className="text-[10px] text-gray-400">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}

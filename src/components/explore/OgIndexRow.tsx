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
  activeTrait?: string | null;
  activeTraitP?: number;
}

export function OgIndexRow({
  row, panelTotal, href, onClick, activeTrait, activeTraitP,
}: Props) {
  const tier = row.tier as ConservationTier;
  const traits = row.traits ?? [];
  const visibleTraits = activeTrait && traits.includes(activeTrait)
    ? [activeTrait, ...traits.filter((t) => t !== activeTrait)].slice(0, 5)
    : traits.slice(0, 5);
  const pValue = activeTrait ? activeTraitP : row.bestTraitP;
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
        {traits.length > 0 ? (
          <span className="inline-flex flex-wrap gap-1">
            {visibleTraits.map((t) => (
              <span
                key={t}
                className={`text-[10px] font-mono border rounded px-1 py-[1px] ${
                  t === activeTrait
                    ? 'border-green-200 bg-green-50 text-green-800'
                    : 'border-amber-200 bg-amber-50 text-amber-800'
                }`}
                title={t}
              >
                {TRAIT_ABBR[t] ?? t.slice(0, 3).toUpperCase()}
              </span>
            ))}
            {traits.length > visibleTraits.length && (
              <span className="text-[10px] text-gray-400">+{traits.length - visibleTraits.length}</span>
            )}
            {pValue !== undefined && (
              <span
                className="text-[10px] text-gray-500 tabular-nums"
                title={activeTrait ? `${activeTrait} p-value` : 'Best trait p-value'}
              >
                p={pValue < 1e-4 ? pValue.toExponential(1) : pValue.toFixed(3)}
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

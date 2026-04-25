import { Link } from 'react-router-dom';
import { tierLabel, tierTone, type ConservationTier } from '@/lib/og-conservation';
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
    <tr
      onClick={onClick}
      className="border-b border-gray-100 hover:bg-green-50 cursor-pointer"
    >
      <td className="pl-3 pr-2 py-1.5">
        <Link
          to={href}
          onClick={(e) => e.stopPropagation()}
          className="font-mono text-[12px] text-gray-900 hover:text-green-700 hover:underline"
        >
          {row.ogId}
        </Link>
      </td>
      <td className="px-2 py-1.5">
        <span className={`text-[10px] uppercase tracking-wide border rounded px-1.5 py-[1px] ${tierTone(tier)}`}>
          {tierLabel(tier)}
        </span>
      </td>
      <td className="px-2 py-1.5 text-right tabular-nums text-[12px] text-gray-700">
        {row.presentCount}/{panelTotal}
      </td>
      <td className="px-2 py-1.5 text-right tabular-nums text-[12px] text-gray-700">
        {row.irgspCopyCount === 0 ? <span className="text-gray-400">×</span> : `×${row.irgspCopyCount}`}
      </td>
      <td className="px-2 py-1.5 text-right tabular-nums text-[12px] text-gray-700">
        {row.memberCount}
      </td>
      <td className="px-2 py-1.5">
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
      </td>
    </tr>
  );
}

import { Link } from 'react-router-dom';
import { useTraitHits } from '@/hooks/useTraitHits';
import { TRAITS } from '@/config/traits';

interface Props {
  ogId: string;
  activeTraitId: string | null;
}

function formatP(p: number): string {
  if (p < 1e-4) return p.toExponential(1);
  return p.toFixed(3);
}

/**
 * 9-trait p-value chip strip for OG detail hero. Active trait is
 * highlighted; clicking a chip swaps `?trait=` on the current OG
 * page so the trait-scoped cards (active-run, lead-SV) populate
 * without losing OG context. Clicking the active chip clears the
 * trait selection.
 */
export function OgTraitHitChips({ ogId, activeTraitId }: Props) {
  const { hitsForOg, loading } = useTraitHits();
  const hits = hitsForOg(ogId);
  if (loading) {
    return <span className="text-[11px] text-gray-400">loading trait hits…</span>;
  }
  if (hits.length === 0) {
    return (
      <span className="text-[11px] text-gray-400">
        no trait hits at p&lt;0.05 across the 9 traits
      </span>
    );
  }
  const traitLabels = new Map<string, string>(TRAITS.map((t) => [t.id, t.label]));
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] text-gray-500 mr-0.5">trait hits:</span>
      {hits.map((h) => {
        const isActive = h.t === activeTraitId;
        const nextHref = isActive
          ? `/og/${encodeURIComponent(ogId)}`
          : `/og/${encodeURIComponent(ogId)}?trait=${h.t}`;
        return (
          <Link
            key={h.t}
            to={nextHref}
            title={`${traitLabels.get(h.t) ?? h.t} · p=${formatP(h.p)}${h.lfc !== undefined ? ` · log2FC ${h.lfc.toFixed(2)}` : ''}${isActive ? ' · click to clear' : ''}`}
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded border tabular-nums ${
              isActive
                ? 'border-green-400 bg-green-100 text-green-800'
                : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            {traitAbbr(h.t)} {formatP(h.p)}
          </Link>
        );
      })}
    </div>
  );
}

function traitAbbr(t: string): string {
  switch (t) {
    case 'heading_date':
      return 'HD';
    case 'culm_length':
      return 'CL';
    case 'panicle_length':
      return 'PL';
    case 'panicle_number':
      return 'PN';
    case 'spikelets_per_panicle':
      return 'SPP';
    case 'ripening_rate':
      return 'RR';
    case 'grain_weight':
      return 'GW';
    case 'pre_harvest_sprouting':
      return 'PHS';
    case 'bacterial_leaf_blight':
      return 'BLB';
    default:
      return t.slice(0, 3).toUpperCase();
  }
}

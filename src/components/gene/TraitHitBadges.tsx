import { Link } from 'react-router-dom';
import type { TraitHit } from '@/hooks/useTraitHits';

interface Props {
  hits: TraitHit[];
  max?: number;
  ogId?: string;
}

function traitAbbr(trait: string): string {
  // "heading_date" -> "HD", "bacterial_leaf_blight" -> "BLB"
  return trait
    .split('_')
    .map((w) => (w[0] ?? '').toUpperCase())
    .join('');
}

function formatP(p: number): string {
  if (p < 1e-4) return p.toExponential(1);
  return p.toFixed(3);
}

/**
 * Small badges showing traits where the OG has p < threshold. Compact form
 * uses trait abbreviations ("HD", "BLB"). Full trait name in tooltip and on
 * click routes to the Analysis home; the specific run link lands in Phase 2
 * once analysis_runs documents exist.
 */
export function TraitHitBadges({ hits, max = 3, ogId }: Props) {
  if (hits.length === 0) return null;
  const shown = hits.slice(0, max);
  const overflow = hits.length - shown.length;
  return (
    <span className="inline-flex items-center gap-1 flex-wrap">
      {shown.map((h) => {
        const tip =
          `${h.t}: p=${formatP(h.p)}` +
          (h.lfc !== undefined ? ` · log2FC ${h.lfc.toFixed(2)}` : '');
        const to = ogId ? `/og/${ogId}` : '/analysis';
        return (
          <Link
            key={h.t}
            to={to}
            title={tip}
            className="text-[9px] font-mono uppercase tracking-wide px-1 py-[1px] rounded border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
            onClick={(e) => e.stopPropagation()}
          >
            {traitAbbr(h.t)}
          </Link>
        );
      })}
      {overflow > 0 && (
        <span
          title={hits
            .slice(max)
            .map((h) => `${h.t}: p=${formatP(h.p)}`)
            .join('\n')}
          className="text-[9px] text-gray-500 px-1"
        >
          +{overflow}
        </span>
      )}
    </span>
  );
}

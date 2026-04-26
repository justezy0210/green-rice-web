import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import type { TraitHit } from '@/hooks/useTraitHits';

interface Props {
  hit: TraitHit;
  ogId?: string;
}

const TRAIT_ABBR_FALLBACK_LEN = 0;

function traitAbbr(trait: string): string {
  return trait
    .split('_')
    .map((w) => (w[0] ?? '').toUpperCase())
    .filter((c) => c.length > TRAIT_ABBR_FALLBACK_LEN)
    .join('');
}

function formatP(p: number): string {
  if (p < 1e-4) return p.toExponential(1);
  return p.toFixed(3);
}

/**
 * One trait-hit chip — amber pill linking to the OG detail (or the
 * Discovery home as fallback when no OG is in scope). Built on the
 * `Badge` primitive with `variant="warning"` for the amber palette;
 * routing is wired through Base UI's `render` prop so the chip
 * functions as a real `<a>` element without nested-anchor risk.
 */
export function TraitHitBadge({ hit, ogId }: Props) {
  const tip =
    `${hit.t}: p=${formatP(hit.p)}` +
    (hit.lfc !== undefined ? ` · log2FC ${hit.lfc.toFixed(2)}` : '');
  const to = ogId ? `/og/${ogId}` : '/discovery';
  return (
    <Badge
      variant="warning"
      className="text-[9px] font-mono uppercase tracking-wide px-1 py-[1px] rounded h-auto"
      render={
        <Link
          to={to}
          title={tip}
          onClick={(e) => e.stopPropagation()}
        />
      }
    >
      {traitAbbr(hit.t)}
    </Badge>
  );
}

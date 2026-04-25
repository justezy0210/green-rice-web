import { TraitHitBadge } from '@/components/badges/TraitHitBadge';
import type { TraitHit } from '@/hooks/useTraitHits';

interface Props {
  hits: TraitHit[];
  max?: number;
  ogId?: string;
}

function formatP(p: number): string {
  if (p < 1e-4) return p.toExponential(1);
  return p.toFixed(3);
}

/**
 * Compact list of trait-hit chips. Each visible hit becomes a
 * `TraitHitBadge` (amber, links to OG detail when ogId is given).
 * Overflow beyond `max` collapses to a `+N` count with the remaining
 * traits in a tooltip.
 */
export function TraitHitBadges({ hits, max = 3, ogId }: Props) {
  if (hits.length === 0) return null;
  const shown = hits.slice(0, max);
  const overflow = hits.length - shown.length;
  return (
    <span className="inline-flex items-center gap-1 flex-wrap">
      {shown.map((h) => (
        <TraitHitBadge key={h.t} hit={h} ogId={ogId} />
      ))}
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

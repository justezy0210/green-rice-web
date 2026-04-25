import { Badge } from '@/components/ui/badge';
import {
  tierLabel,
  tierTone,
  type ConservationTier,
} from '@/lib/og-conservation';
import { cn } from '@/lib/utils';

interface Props {
  tier: ConservationTier;
  className?: string;
}

/**
 * Conservation tier badge. Tone palette is sourced from `tierTone()` —
 * the canonical SSOT for tier color in `src/lib/og-conservation.ts`.
 * The generic `Badge` primitive only handles spacing, focus ring, and
 * default radius/border defaults; the domain palette is composed in
 * via `className` so generic and domain layers stay separated.
 */
export function TierBadge({ tier, className }: Props) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'rounded-md border px-1.5 py-[1px] text-[10px] font-medium uppercase tracking-wide h-auto',
        tierTone(tier),
        className,
      )}
    >
      {tierLabel(tier)}
    </Badge>
  );
}

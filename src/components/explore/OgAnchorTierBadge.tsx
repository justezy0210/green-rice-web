import type {
  AnchorRepresentativenessTier,
  TierMetrics,
} from '@/lib/og-anchor-tier';

interface Props {
  metrics: TierMetrics;
}

const TIER_LABEL: Record<AnchorRepresentativenessTier, string> = {
  representative: 'Anchor representative',
  mixed: 'Anchor mixed',
  nonrepresentative: 'Anchor non-representative',
};

const TIER_CLASS: Record<AnchorRepresentativenessTier, string> = {
  representative: 'border-green-200 bg-green-50 text-green-700',
  mixed: 'border-amber-200 bg-amber-50 text-amber-800',
  nonrepresentative: 'border-gray-300 bg-gray-100 text-gray-700',
};

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function OgAnchorTierBadge({ metrics }: Props) {
  const { tier, counts, cultivarCount } = metrics;
  const tooltip =
    `anchor locus: ${counts.annotatedHere}/${cultivarCount} ` +
    `(${pct(metrics.occupancy)})\n` +
    `elsewhere: ${counts.elsewhere}/${cultivarCount} ` +
    `(${pct(metrics.elsewhere)})\n` +
    `no annotation: ${counts.noAnnotation}/${cultivarCount} ` +
    `(${pct(metrics.noAnnotation)})`;
  return (
    <span
      title={tooltip}
      className={`text-[10px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${TIER_CLASS[tier]}`}
    >
      {TIER_LABEL[tier]}
      <span className="text-[9px] opacity-70 tabular-nums">
        {pct(metrics.occupancy)}
      </span>
    </span>
  );
}

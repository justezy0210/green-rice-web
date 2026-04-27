import { impactClassLabel } from '@/lib/impact-class-label';
import type { DiscoveryLocusReviewSummary } from '@/lib/discovery-locus-review-summary';

export function ReviewSvCount({
  summary,
  loading,
}: {
  summary: DiscoveryLocusReviewSummary | null;
  loading: boolean;
}) {
  if (loading) {
    return <span className="text-xs text-gray-400">...</span>;
  }
  const traitLinks = summary?.prioritizedPatternCount ?? 0;
  const distinctSvCount = summary?.uniquePrioritizedSvCount ?? 0;

  return (
    <div className="tabular-nums">
      <div className="font-mono text-sm font-semibold text-gray-900">{distinctSvCount}</div>
      <div className="text-[10px] text-gray-500">
        {traitLinks} trait link{traitLinks === 1 ? '' : 's'}
      </div>
    </div>
  );
}

export function StrongestPattern({
  summary,
  traitLabel,
}: {
  summary: DiscoveryLocusReviewSummary | null;
  traitLabel: (traitId: string) => string;
}) {
  const row = summary?.bestPattern ?? null;
  if (!row) {
    return <span className="text-xs text-gray-400">No prioritized SV pattern</span>;
  }

  return (
    <div className="min-w-0 text-[11px] text-gray-700">
      <div className="truncate font-medium text-gray-900" title={row.eventId}>
        {row.svType ?? 'SV'} · {impactLabel(row)}
      </div>
      <div className="mt-0.5 truncate text-gray-500">
        {traitLabel(row.traitId)}
        {row.spread !== null ? ` · group gap ${Math.round(row.spread * 100)} pp` : ''}
        {row.score !== null ? ` · score ${row.score.toFixed(2)}` : ''}
      </div>
    </div>
  );
}

export function CandidateSummary({ summary }: { summary: DiscoveryLocusReviewSummary | null }) {
  if (!summary?.primaryOgId && !summary?.primaryGeneId) {
    return <span className="text-xs text-gray-400">Review detail</span>;
  }

  return (
    <div className="min-w-0 text-[11px]">
      {summary.primaryOgId && (
        <div className="truncate font-mono font-medium text-gray-900" title={summary.primaryOgId}>
          {summary.primaryOgId}
        </div>
      )}
      {summary.primaryGeneId && (
        <div className="mt-0.5 truncate font-mono text-gray-500" title={summary.primaryGeneId}>
          {summary.primaryGeneId}
        </div>
      )}
    </div>
  );
}

function impactLabel(row: NonNullable<DiscoveryLocusReviewSummary['bestPattern']>): string {
  return row.impactClass ? impactClassLabel(row.impactClass) : 'impact not classified';
}

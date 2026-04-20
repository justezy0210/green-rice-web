import type { ReactNode } from 'react';
import { Layer2CoverageBadge } from './Layer2CoverageBadge';
import type { statusCopy } from '@/lib/cluster-region-status';
import type { RegionData } from '@/types/orthogroup';

export function ClusterHeader({
  region,
  statusTone,
}: {
  region: RegionData;
  statusTone: ReturnType<typeof statusCopy> | null;
}) {
  const lift = region.liftover;
  return (
    <div className="text-[11px] text-gray-500 flex items-center gap-3 flex-wrap px-1">
      <span>
        Source:{' '}
        <span className="text-green-700 font-medium">cluster-derived lifted region</span>
      </span>
      <span>
        Anchor:{' '}
        <span className="font-mono text-gray-700">{region.anchor.cultivar}</span>
      </span>
      <span className="font-mono">
        {region.anchor.regionSpan.chr}:
        {region.anchor.regionSpan.start.toLocaleString()}-
        {region.anchor.regionSpan.end.toLocaleString()}
      </span>
      {lift.irgspRegion && (
        <span>
          → IRGSP{' '}
          <span className="font-mono">
            {lift.irgspRegion.chr}:{lift.irgspRegion.start.toLocaleString()}-
            {lift.irgspRegion.end.toLocaleString()}
          </span>
        </span>
      )}
      {statusTone?.badge && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${statusTone.toneClass}`}>
          {statusTone.badge}
        </span>
      )}
      <Layer2CoverageBadge />
    </div>
  );
}

export function FrameNote() {
  return (
    <p className="text-[11px] text-gray-600 bg-gray-50 border border-gray-200 rounded px-3 py-2">
      Supporting variant evidence for this candidate. AF values are ALT-path frequencies within each
      phenotype group — not per-cultivar copy counts, and not proof of which variant explains the
      trait or the presence/absence of this OG.
    </p>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-8 text-center text-sm text-gray-600">
      {title}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      {action}
    </div>
  );
}


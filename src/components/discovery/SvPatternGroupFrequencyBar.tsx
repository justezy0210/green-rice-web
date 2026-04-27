import type { SvGroupFreq } from '@/types/sv-event';

interface Props {
  group: { label: string; freq: SvGroupFreq | null };
  toneIndex: number;
}

export function SvPatternGroupFrequencyBar({ group, toneIndex }: Props) {
  const pct = group.freq ? Math.round(group.freq.freq * 100) : null;
  const width = pct === null ? 0 : Math.max(0, Math.min(100, pct));

  return (
    <div className="grid grid-cols-[minmax(96px,140px)_1fr_minmax(64px,80px)] items-center gap-2 text-xs">
      <div className="min-w-0 truncate text-gray-600" title={group.label}>
        {group.label}
      </div>
      <div className="h-2 overflow-hidden rounded bg-gray-100">
        <div className={`h-full rounded ${barTone(toneIndex)}`} style={{ width: `${width}%` }} />
      </div>
      <div className="text-right font-mono text-[11px] text-gray-600">
        {group.freq ? `${pct}% ${group.freq.alt}/${group.freq.total}` : 'n/a'}
      </div>
    </div>
  );
}

function barTone(index: number): string {
  if (index % 3 === 0) return 'bg-green-600';
  if (index % 3 === 1) return 'bg-amber-500';
  return 'bg-sky-500';
}

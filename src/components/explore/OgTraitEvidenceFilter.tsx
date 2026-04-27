import { useMemo } from 'react';
import { TRAITS } from '@/config/traits';
import type { OgIndexRow } from '@/lib/og-index-service';
import type { TraitId } from '@/types/traits';

interface Props {
  rows: OgIndexRow[];
  selected: TraitId | null;
  onSelect: (trait: TraitId | null) => void;
}

export function OgTraitEvidenceFilter({ rows, selected, onSelect }: Props) {
  const counts = useMemo(() => {
    const next = new Map<string, number>();
    for (const row of rows) {
      for (const trait of row.traits ?? []) {
        next.set(trait, (next.get(trait) ?? 0) + 1);
      }
    }
    return next;
  }, [rows]);
  const total = Array.from(counts.values()).reduce((sum, value) => sum + value, 0);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[10px] uppercase tracking-wide text-gray-500">
        Trait evidence
      </span>
      <TraitButton active={selected === null} label="All" count={total} onClick={() => onSelect(null)} />
      {TRAITS.map((trait) => (
        <TraitButton
          key={trait.id}
          active={selected === trait.id}
          label={trait.label}
          count={counts.get(trait.id) ?? 0}
          onClick={() => onSelect(selected === trait.id ? null : trait.id)}
        />
      ))}
    </div>
  );
}

function TraitButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded border px-2 py-[2px] text-[11px] ${
        active
          ? 'border-amber-400 bg-amber-100 font-medium text-amber-900'
          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
      }`}
      title={label}
    >
      <span>{label}</span>
      <span className="tabular-nums text-[10px] text-gray-500">{count.toLocaleString()}</span>
    </button>
  );
}

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TraitId } from '@/types/grouping';
import { TRAITS, isTraitId } from '@/config/traits';

interface Props {
  value: TraitId | null;
  onChange: (id: TraitId) => void;
}

const NONE = '__none__';

const LABEL_BY_ID: Record<string, string> = Object.fromEntries(
  TRAITS.map((t) => [t.id, t.label]),
);

export function TraitSelector({ value, onChange }: Props) {
  // Radix Select pulls the visible label from the currently mounted
  // SelectItem. On first render with a preselected value (e.g. from the
  // URL) the item list lives in a portal that is not mounted yet, so
  // SelectValue falls back to the raw id. Passing the resolved label as
  // children short-circuits that.
  return (
    <Select
      value={value ?? NONE}
      onValueChange={(v) => {
        if (isTraitId(v)) onChange(v);
      }}
    >
      <SelectTrigger className="w-64 h-9 text-sm">
        <SelectValue placeholder="Select a trait…">
          {value ? LABEL_BY_ID[value] ?? value : null}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {TRAITS.map((t) => (
          <SelectItem key={t.id} value={t.id}>
            {t.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

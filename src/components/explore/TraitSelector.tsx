import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TraitId } from '@/types/grouping';
import { TRAITS } from '@/config/traits';

interface Props {
  value: TraitId | null;
  onChange: (id: TraitId) => void;
}

const NONE = '__none__';

export function TraitSelector({ value, onChange }: Props) {
  return (
    <Select
      value={value ?? NONE}
      onValueChange={(v) => {
        if (v && v !== NONE) onChange(v as TraitId);
      }}
    >
      <SelectTrigger className="w-64 h-9 text-sm">
        <SelectValue placeholder="Select a trait…" />
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

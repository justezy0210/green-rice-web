import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TraitId } from '@/types/grouping';

const TRAITS: { id: TraitId; label: string }[] = [
  { id: 'heading_date', label: 'Days to Heading' },
  { id: 'culm_length', label: 'Culm Length' },
  { id: 'panicle_length', label: 'Panicle Length' },
  { id: 'panicle_number', label: 'Panicle Number' },
  { id: 'spikelets_per_panicle', label: 'Spikelets / Panicle' },
  { id: 'ripening_rate', label: 'Ripening Rate' },
  { id: 'grain_weight', label: '1000-Grain Weight' },
  { id: 'pre_harvest_sprouting', label: 'Pre-harvest Sprouting' },
  { id: 'bacterial_leaf_blight', label: 'Bacterial Leaf Blight' },
];

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

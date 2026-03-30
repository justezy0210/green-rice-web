import { useState } from 'react';
import { PHENOTYPE_FIELDS } from '@/lib/utils';

interface ColumnVisibilityToggleProps {
  visibleFields: string[];
  onChange: (fields: string[]) => void;
}

export function ColumnVisibilityToggle({ visibleFields, onChange }: ColumnVisibilityToggleProps) {
  const [open, setOpen] = useState(false);

  function toggle(key: string) {
    onChange(
      visibleFields.includes(key)
        ? visibleFields.filter((f) => f !== key)
        : [...visibleFields, key]
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50 flex items-center gap-1"
      >
        Columns <span className="text-gray-400">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-56 bg-white border rounded-md shadow-lg z-20 p-2">
          {PHENOTYPE_FIELDS.map((f) => (
            <label key={f.key} className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 cursor-pointer text-sm rounded">
              <input
                type="checkbox"
                checked={visibleFields.includes(f.key)}
                onChange={() => toggle(f.key)}
                className="accent-green-600"
              />
              <span>{f.label}</span>
              <span className="text-xs text-gray-400">({f.unit})</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

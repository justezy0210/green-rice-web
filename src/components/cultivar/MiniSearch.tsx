import { useState } from 'react';
import { Input } from '@/components/ui/input';
import type { PhenotypeRecord } from '@/types/phenotype';

interface Props {
  records: PhenotypeRecord[];
  onSelect: (name: string) => void;
}

export function MiniSearch({ records, onSelect }: Props) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(-1);

  const hits = open
    ? records.filter((r) => {
        if (!q.trim()) return true;
        const s = q.toLowerCase();
        return r.cultivar.toLowerCase().includes(s) || (r.crossInformation ?? '').toLowerCase().includes(s);
      })
    : [];

  function pick(name: string) {
    setQ('');
    setOpen(false);
    setIdx(-1);
    (document.activeElement as HTMLElement)?.blur();
    onSelect(name);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (!hits.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => (i + 1) % hits.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => (i <= 0 ? hits.length - 1 : i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); pick((idx >= 0 ? hits[idx] : hits[0]).cultivar); }
    else if (e.key === 'Escape') { setOpen(false); setIdx(-1); }
  }

  return (
    <div className="relative">
      <Input
        type="text"
        placeholder="Search cultivar…"
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setIdx(-1); }}
        onKeyDown={handleKey}
        onFocus={() => { setOpen(true); setIdx(-1); }}
        onBlur={() => { setTimeout(() => setOpen(false), 150); }}
        className="w-72"
      />
      {hits.length > 0 && (
        <ul className="absolute z-20 right-0 w-full mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-48 overflow-y-auto">
          {hits.map((r, i) => (
            <li key={r.cultivar}>
              {/* raw: full-width suggestion-list-item button — see DashboardPage. */}
              <button
                className={`w-full text-left px-3 py-1.5 text-xs cursor-pointer flex items-center justify-between ${i === idx ? 'bg-green-100 text-green-800' : 'hover:bg-green-50'}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(r.cultivar)}
              >
                <span>{r.cultivar}</span>
                {r.crossInformation && (
                  <span className="text-gray-400 ml-2 truncate max-w-36">{r.crossInformation}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

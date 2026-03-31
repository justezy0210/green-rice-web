import type { CultivarDoc } from '@/types/cultivar';

interface Props {
  cultivars: (CultivarDoc & { id: string })[];
  onEdit: (cultivar: CultivarDoc & { id: string }) => void;
  onDelete: (id: string) => void;
}

export function CultivarTable({ cultivars, onEdit, onDelete }: Props) {
  if (cultivars.length === 0) {
    return (
      <p className="text-center text-gray-500 py-8">No cultivars found.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="py-2 pr-4 font-medium">Name</th>
            <th className="py-2 pr-4 font-medium">Heading (E/N/L)</th>
            <th className="py-2 pr-4 font-medium">Culm</th>
            <th className="py-2 pr-4 font-medium">Panicle L.</th>
            <th className="py-2 pr-4 font-medium">Grain Wt.</th>
            <th className="py-2 pr-4 font-medium">BLB</th>
            <th className="py-2 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {cultivars.map((c) => {
            const blb = c.resistance.bacterialLeafBlight;
            const blbCount = [blb.k1, blb.k2, blb.k3, blb.k3a].filter(Boolean).length;
            return (
              <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="py-2 pr-4 font-medium">{c.name}</td>
                <td className="py-2 pr-4 tabular-nums">
                  {fmt(c.daysToHeading.early)} / {fmt(c.daysToHeading.normal)} / {fmt(c.daysToHeading.late)}
                </td>
                <td className="py-2 pr-4 tabular-nums">{fmt(c.morphology.culmLength)}</td>
                <td className="py-2 pr-4 tabular-nums">{fmt(c.morphology.panicleLength)}</td>
                <td className="py-2 pr-4 tabular-nums">{fmt(c.quality.grainWeight)}</td>
                <td className="py-2 pr-4 tabular-nums">{blbCount}/4</td>
                <td className="py-2 text-right space-x-2">
                  <button
                    onClick={() => onEdit(c)}
                    className="px-2 py-1 text-xs rounded bg-green-50 text-green-700 hover:bg-green-100"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${c.name}"?`)) onDelete(c.id);
                    }}
                    className="px-2 py-1 text-xs rounded bg-red-50 text-red-700 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function fmt(v: number | null): string {
  return v != null ? String(v) : '–';
}

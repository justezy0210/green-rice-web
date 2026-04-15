import type { PhenotypeRecord } from '@/types/phenotype';
import { cn } from '@/lib/utils';

const BLB_STRAINS = ['k1', 'k2', 'k3', 'k3a'] as const;

interface Props {
  records: PhenotypeRecord[];
  onClickCultivar?: (name: string) => void;
  /** Map cultivar name → group text color (hex or rgba). Missing entries render default color. */
  cultivarNameToColor?: Record<string, string>;
}

export function ResistanceGrid({ records, onClickCultivar, cultivarNameToColor }: Props) {
  return (
    <div>
      <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-green-400 inline-block" /> Resistant
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-red-200 inline-block" /> Susceptible
        </span>
      </div>
      <table className="text-xs border-collapse w-full">
        <thead>
          <tr>
            <th className="text-left pr-4 py-1 text-gray-500 font-medium">Cultivar</th>
            {BLB_STRAINS.map((s) => (
              <th key={s} className="px-2 py-1 text-center text-gray-500 font-medium">{s.toUpperCase()}</th>
            ))}
            <th className="px-2 py-1 text-center text-gray-500 font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => {
            const detail = r.bacterialLeafBlightDetail;
            const groupColor = cultivarNameToColor?.[r.cultivar];
            return (
              <tr key={r.cultivar} className="hover:bg-gray-50">
                <td
                  className="pr-4 py-1 font-medium whitespace-nowrap cursor-pointer hover:underline"
                  style={{ color: groupColor ?? undefined }}
                  onClick={() => onClickCultivar?.(r.cultivar)}
                >
                  <span className="flex items-center gap-1.5">
                    {groupColor && (
                      <span
                        className="w-2 h-2 rounded-full inline-block"
                        style={{ backgroundColor: groupColor }}
                      />
                    )}
                    {r.cultivar}
                  </span>
                </td>
                {BLB_STRAINS.map((s) => {
                  const val = detail?.[s];
                  return (
                    <td key={s} className="px-2 py-1 text-center">
                      <div
                        className={cn(
                          'w-6 h-6 rounded-sm mx-auto',
                          val === true ? 'bg-green-400' : val === false ? 'bg-red-200' : 'bg-gray-100',
                        )}
                        title={val === true ? 'Resistant' : val === false ? 'Susceptible' : 'Unknown'}
                      />
                    </td>
                  );
                })}
                <td className="px-2 py-1 text-center font-medium text-gray-600">
                  {r.bacterialLeafBlight ?? '–'}<span className="text-gray-400">/4</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

import { TRAITS } from '@/config/traits';
import type { DiscoveryBlockGroup } from '@/lib/discovery-block-groups';
import type { TraitId } from '@/types/traits';

const traitLabel = new Map<string, string>(TRAITS.map((trait) => [trait.id, trait.label]));

interface Props {
  group: DiscoveryBlockGroup;
  selectedTraitId: TraitId | null;
  onSelectTrait: (traitId: TraitId) => void;
  onClear: () => void;
}

export function LocusTraitFilterBar({
  group,
  selectedTraitId,
  onSelectTrait,
  onClear,
}: Props) {
  return (
    <div className="rounded-md border border-gray-100 bg-white px-3 py-2 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-gray-500">Trait filter</div>
          <div className="mt-0.5 text-xs text-gray-500">
            {selectedTraitId ? traitLabel.get(selectedTraitId) ?? selectedTraitId : 'All traits'}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            className={chipClass(selectedTraitId === null)}
            onClick={onClear}
          >
            All traits
          </button>
          {group.traitIds.map((traitId) => (
            <button
              key={traitId}
              type="button"
              className={chipClass(selectedTraitId === traitId)}
              onClick={() => onSelectTrait(traitId as TraitId)}
            >
              {traitLabel.get(traitId) ?? traitId}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function chipClass(active: boolean): string {
  return active
    ? 'rounded border border-green-300 bg-green-50 px-2 py-1 text-[11px] font-medium text-green-800'
    : 'rounded border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] text-gray-600 hover:border-green-200 hover:bg-green-50 hover:text-green-800';
}

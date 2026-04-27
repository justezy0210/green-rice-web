import { traitGroupForCultivar } from '@/lib/trait-grouping';
import type { SvEvent } from '@/types/sv-event';
import type { TraitId } from '@/types/traits';

interface Props {
  event: SvEvent | null;
  samples: string[];
  loading: boolean;
  traitId: TraitId;
}

export function CultivarGenotypeStrip({ event, samples, loading, traitId }: Props) {
  if (loading) {
    return <p className="text-xs text-gray-400">Loading cultivar genotypes...</p>;
  }
  if (!event || samples.length === 0) {
    return <p className="text-xs text-gray-500">Cultivar genotype row unavailable.</p>;
  }

  return (
    <div className="space-y-1.5 border-t border-gray-100 pt-2">
      <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wide text-gray-400">
        <span>Cultivar genotype by trait group</span>
        <span>ALT / REF / missing</span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(82px,1fr))] gap-1">
        {samples.map((sample) => {
          const gt = event.gts[sample] ?? '.';
          const state = genotypeState(gt);
          const group = traitGroupForCultivar(traitId, sample);
          return (
            <span
              key={sample}
              className={`min-w-0 rounded border px-1.5 py-1 text-[10px] ${genotypeClass(state)}`}
              title={`${sample}: ${gt}${group ? ` · ${group.groupLabel}` : ''}`}
            >
              <span className="block truncate">{sample}</span>
              <span className="flex items-center justify-between gap-1">
                <span className="font-mono">{state === 'alt' ? gt : state.toUpperCase()}</span>
                {group && (
                  <span className="truncate text-[9px] opacity-80">
                    {group.groupLabel}{group.borderline ? '*' : ''}
                  </span>
                )}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function genotypeState(gt: string): 'alt' | 'ref' | 'missing' {
  return gt === '.' || gt === '' ? 'missing' : gt === '0' ? 'ref' : 'alt';
}

function genotypeClass(state: 'alt' | 'ref' | 'missing'): string {
  if (state === 'alt') return 'border-green-200 bg-green-50 text-green-800';
  return state === 'ref'
    ? 'border-gray-200 bg-gray-50 text-gray-500'
    : 'border-dashed border-gray-200 bg-white text-gray-400';
}

import { useSearchParams } from 'react-router-dom';
import { TraitSelector } from '@/components/explore/TraitSelector';
import { GroupingSummaryCard } from '@/components/explore/GroupingSummaryCard';
import { OrthogroupDiffTable } from '@/components/explore/OrthogroupDiffTable';
import { useOrthogroupDiff } from '@/hooks/useOrthogroupDiff';
import type { TraitId } from '@/types/grouping';

const VALID_TRAITS: TraitId[] = [
  'heading_date',
  'culm_length',
  'panicle_length',
  'panicle_number',
  'spikelets_per_panicle',
  'ripening_rate',
  'grain_weight',
  'pre_harvest_sprouting',
  'bacterial_leaf_blight',
];

function isTraitId(v: string | null): v is TraitId {
  return v !== null && (VALID_TRAITS as string[]).includes(v);
}

export function ExplorePage() {
  const [params, setParams] = useSearchParams();
  const rawTrait = params.get('trait');
  const traitId: TraitId | null = isTraitId(rawTrait) ? rawTrait : null;

  const { doc, groupingDoc, isStale, loading } = useOrthogroupDiff(traitId);

  function setTrait(id: TraitId) {
    setParams((prev) => { prev.set('trait', id); return prev; }, { replace: true });
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Explore Candidates</h1>
        <p className="text-sm text-gray-500 mt-1">
          Phenotype-driven exploration: pick a trait and see orthogroups differing most between groups.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Trait</label>
          <TraitSelector value={traitId} onChange={setTrait} />
        </div>
      </div>

      {!traitId && (
        <div className="border border-gray-200 rounded-lg p-8 text-center text-sm text-gray-500">
          Select a phenotype trait above to explore candidate orthogroups.
        </div>
      )}

      {traitId && (
        <>
          <GroupingSummaryCard groupingDoc={groupingDoc} />
          {loading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : (
            <OrthogroupDiffTable doc={doc} isStale={isStale} />
          )}
        </>
      )}
    </div>
  );
}

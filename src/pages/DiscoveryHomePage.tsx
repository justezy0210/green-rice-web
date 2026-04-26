import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { DiscoveryRunRow } from '@/components/discovery/DiscoveryRunRow';
import { LocusTraitMatrix } from '@/components/discovery/LocusTraitMatrix';
import { TRAITS } from '@/config/traits';
import { useAnalysisRuns } from '@/hooks/useAnalysisRuns';
import { useDiscoveryBlocks } from '@/hooks/useDiscoveryBlocks';
import { selectRepresentativeDiscoveryRuns } from '@/lib/discovery-runs';
import type { AnalysisRun } from '@/types/analysis-run';

const traitOrder = new Map<string, number>(TRAITS.map((trait, index) => [trait.id, index]));
const traitLabel = new Map<string, string>(TRAITS.map((trait) => [trait.id, trait.label]));

export function DiscoveryHomePage() {
  const { runs, loading, error } = useAnalysisRuns();
  const representativeRuns = useMemo(
    () => sortRuns(selectRepresentativeDiscoveryRuns(runs)),
    [runs],
  );
  const blockState = useDiscoveryBlocks(representativeRuns);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold text-gray-900">Candidate Discovery</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-600">
          Candidate loci and trait-level results from the current promoted runs.
          Entity pages remain the canonical browse surfaces for{' '}
          <Link to="/cultivars" className="text-green-700 hover:underline">
            cultivars
          </Link>
          ,{' '}
          <Link to="/genes" className="text-green-700 hover:underline">
            genes
          </Link>
          , and{' '}
          <Link to="/og" className="text-green-700 hover:underline">
            orthogroups
          </Link>
          .
        </p>
      </header>

      {loading ? (
        <Card>
          <CardContent className="py-5 text-sm text-gray-400">
            Loading discovery runs...
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-5 text-sm text-red-500">{error.message}</CardContent>
        </Card>
      ) : representativeRuns.length === 0 ? (
        <EmptyDiscoveryState />
      ) : (
        <>
          <LocusTraitMatrix
            blocks={blockState.blocks}
            runs={representativeRuns}
            loading={blockState.loading}
            error={blockState.error}
            traitLabel={labelForTrait}
          />

          <Card>
            <CardContent className="py-4">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-xs uppercase tracking-wide text-gray-500">
                  Trait run overview
                </h2>
                <span className="text-[10px] text-gray-400">
                  current promoted run per trait
                </span>
              </div>
              <ul className="divide-y divide-gray-100">
                {representativeRuns.map((run) => (
                  <DiscoveryRunRow
                    key={run.runId}
                    run={run}
                    traitLabel={labelForTrait(run.traitId)}
                  />
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function EmptyDiscoveryState() {
  return (
    <Card>
      <CardContent className="py-5 text-sm text-gray-500">
        No current discovery runs are present. Runs materialize once{' '}
        <code className="rounded bg-gray-100 px-1 py-0.5 text-[11px]">
          scripts/promote-analysis-run.py
        </code>{' '}
        has been executed against Firestore.
      </CardContent>
    </Card>
  );
}

function sortRuns(runs: AnalysisRun[]): AnalysisRun[] {
  return [...runs].sort((a, b) => {
    const ai = traitOrder.get(a.traitId) ?? Number.MAX_SAFE_INTEGER;
    const bi = traitOrder.get(b.traitId) ?? Number.MAX_SAFE_INTEGER;
    if (ai !== bi) return ai - bi;
    return a.traitId.localeCompare(b.traitId);
  });
}

function labelForTrait(traitId: string): string {
  return traitLabel.get(traitId) ?? traitId.replaceAll('_', ' ');
}

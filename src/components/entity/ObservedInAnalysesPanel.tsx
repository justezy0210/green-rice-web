import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { useObservedInAnalyses } from '@/hooks/useObservedInAnalyses';
import type { EntityAnalysisLink, EntityType } from '@/types/candidate';

interface Props {
  entityType: EntityType;
  entityId: string;
  /** If provided, bypasses the Firestore lookup. */
  links?: EntityAnalysisLink[];
}

/**
 * Entity-page backlink panel. Fetches `entity_analysis_index/{entityType}_{entityId}`
 * and lists the runs / candidates that reference this entity. Empty state
 * remains while the Phase 2B precompute has not yet populated the index.
 */
export function ObservedInAnalysesPanel({ entityType, entityId, links }: Props) {
  const remote = useObservedInAnalyses(entityType, links ? null : entityId);
  const rows = links ?? remote.links;
  const loading = links ? false : remote.loading;
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="text-xs uppercase tracking-wide text-gray-500">
            Observed in discovery
          </h3>
          <span className="text-[10px] text-gray-400 font-mono">
            {entityType}:{entityId}
          </span>
        </div>
        {loading ? (
          <p className="text-[12px] text-gray-400">Loading discovery links...</p>
        ) : rows.length === 0 ? (
          <p className="text-[12px] text-gray-500 leading-snug">
            No discovery runs reference this entity yet. This panel lists
            candidates across runs once{' '}
            <Link to="/discovery" className="text-green-700 hover:underline">
              Discovery
            </Link>{' '}
            is populated.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 text-[12px]">
            {rows.map((r) => (
              <li key={`${r.runId}:${r.candidateId ?? 'run'}`} className="py-1.5">
                <Link
                  to={
                    r.candidateId
                      ? `/discovery/${r.runId}/candidate/${r.candidateId}`
                      : `/discovery/${r.runId}`
                  }
                  className="text-gray-800 hover:text-green-700 hover:underline"
                >
                  <span className="font-mono text-[11px]">{r.runId}</span>
                  {r.rank !== null && (
                    <span className="ml-2 text-gray-500">rank {r.rank}</span>
                  )}
                  {r.candidateType && (
                    <span className="ml-2 text-gray-500">{r.candidateType}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

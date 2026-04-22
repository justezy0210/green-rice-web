import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { EntityAnalysisIndex, EntityType } from '@/types/candidate';

export async function fetchEntityAnalysisIndex(
  entityType: EntityType,
  entityId: string,
): Promise<EntityAnalysisIndex | null> {
  if (!entityId) return null;
  const docId = `${entityType}_${entityId}`;
  const snap = await getDoc(doc(db, 'entity_analysis_index', docId));
  if (!snap.exists()) return null;
  const data = snap.data() as Partial<EntityAnalysisIndex>;
  return {
    entityType: (data.entityType as EntityType) ?? entityType,
    entityId: data.entityId ?? entityId,
    linkedRuns: data.linkedRuns ?? [],
    topCandidates: data.topCandidates ?? [],
    topBlocks: data.topBlocks ?? [],
    latestUpdatedAt: data.latestUpdatedAt ?? '',
  };
}

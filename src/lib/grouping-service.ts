import { collection, doc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type {
  GroupingDocument,
  CultivarGroupAssignment,
  TraitId,
} from '@/types/grouping';
import type { ComparisonGroup } from '@/types/common';

export function subscribeGrouping(
  traitId: TraitId,
  callback: (doc: GroupingDocument | null) => void,
): Unsubscribe {
  return onSnapshot(doc(db, 'groupings', traitId), (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    callback(snap.data() as GroupingDocument);
  });
}

export function subscribeAllGroupings(
  callback: (docs: Record<string, GroupingDocument>) => void,
): Unsubscribe {
  return onSnapshot(collection(db, 'groupings'), (snap) => {
    const result: Record<string, GroupingDocument> = {};
    snap.forEach((d) => {
      result[d.id] = d.data() as GroupingDocument;
    });
    callback(result);
  });
}

interface AdapterOptions {
  /** If true, borderline cultivars are included in their assigned group. Default: false. */
  includeBorderline?: boolean;
}

/**
 * Convert cultivarId-keyed assignments into name-based ComparisonGroup[].
 * Borderline cultivars are excluded by default (treated as not belonging to any group).
 * Cultivars not present in nameMap are skipped (stale data).
 * Returns empty array if fewer than 2 groups would result.
 */
export function assignmentsToComparisonGroups(
  assignments: Record<string, CultivarGroupAssignment>,
  cultivarNameMap: Record<string, string>,
  options: AdapterOptions = {},
): ComparisonGroup[] {
  const { includeBorderline = false } = options;

  const groupMap: Record<string, string[]> = {};
  for (const [cultivarId, assignment] of Object.entries(assignments)) {
    if (!includeBorderline && assignment.borderline) continue;
    const name = cultivarNameMap[cultivarId];
    if (!name) continue; // stale cultivar

    if (!groupMap[assignment.groupLabel]) {
      groupMap[assignment.groupLabel] = [];
    }
    groupMap[assignment.groupLabel].push(name);
  }

  const groups: ComparisonGroup[] = Object.entries(groupMap).map(([name, cultivars]) => ({
    name,
    cultivars,
  }));

  return groups.length >= 2 ? groups : [];
}

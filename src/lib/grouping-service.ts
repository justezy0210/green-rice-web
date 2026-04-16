import { collection, doc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type {
  GroupingDocument,
  TraitId,
} from '@/types/grouping';

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

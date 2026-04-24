import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
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


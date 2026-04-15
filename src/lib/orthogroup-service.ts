import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { OrthogroupDiffDocument } from '@/types/orthogroup';
import type { TraitId } from '@/types/grouping';

export function subscribeOrthogroupDiff(
  traitId: TraitId,
  callback: (doc: OrthogroupDiffDocument | null) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, 'orthogroup_diffs', traitId),
    (snap) => callback(snap.exists() ? (snap.data() as OrthogroupDiffDocument) : null),
    () => callback(null),
  );
}

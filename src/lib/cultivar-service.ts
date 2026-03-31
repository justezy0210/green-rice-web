import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { CultivarDoc } from '@/types/cultivar';
import { cultivarNameToId } from '@/types/cultivar';

const COLLECTION = 'cultivars';

export async function getAllCultivars(): Promise<(CultivarDoc & { id: string })[]> {
  const snap = await getDocs(collection(db, COLLECTION));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as CultivarDoc) }));
}

export async function addCultivar(data: CultivarDoc): Promise<void> {
  const id = cultivarNameToId(data.name);
  await setDoc(doc(db, COLLECTION, id), data);
}

export async function updateCultivar(id: string, data: CultivarDoc): Promise<void> {
  await setDoc(doc(db, COLLECTION, id), data);
}

export async function deleteCultivar(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

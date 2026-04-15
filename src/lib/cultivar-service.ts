import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { CultivarDoc } from '@/types/cultivar';
import { cultivarNameToId } from '@/lib/cultivar-helpers';

const COLLECTION = 'cultivars';

export async function getAllCultivars(): Promise<(CultivarDoc & { id: string })[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTION));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as CultivarDoc) }));
  } catch (err) {
    console.error('Failed to load cultivars:', err);
    throw new Error('Failed to load cultivar list.');
  }
}

export async function addCultivar(data: CultivarDoc): Promise<void> {
  try {
    const id = cultivarNameToId(data.name);
    await setDoc(doc(db, COLLECTION, id), data);
  } catch (err) {
    console.error('Failed to add cultivar:', err);
    throw new Error('Failed to add cultivar.');
  }
}

export async function updateCultivar(id: string, data: CultivarDoc): Promise<void> {
  try {
    await setDoc(doc(db, COLLECTION, id), data);
  } catch (err) {
    console.error('Failed to update cultivar:', err);
    throw new Error('Failed to update cultivar.');
  }
}

export async function deleteCultivar(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION, id));
  } catch (err) {
    console.error('Failed to delete cultivar:', err);
    throw new Error('Failed to delete cultivar.');
  }
}

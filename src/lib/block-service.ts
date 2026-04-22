import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { ref as storageRef, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import type { CandidateBlock } from '@/types/candidate-block';
import type { OgIntersectionBundle } from '@/types/intersection';
import type { RunId } from '@/types/analysis-run';

export async function fetchBlock(
  runId: RunId,
  blockId: string,
): Promise<CandidateBlock | null> {
  const snap = await getDoc(doc(db, 'analysis_runs', runId, 'blocks', blockId));
  return snap.exists() ? (snap.data() as CandidateBlock) : null;
}

export async function listBlocks(runId: RunId): Promise<CandidateBlock[]> {
  const col = collection(db, 'analysis_runs', runId, 'blocks');
  const snap = await getDocs(col);
  return snap.docs.map((d) => d.data() as CandidateBlock);
}

export async function listCandidatesInBlock(
  runId: RunId,
  blockId: string,
): Promise<Array<Record<string, unknown>>> {
  const col = collection(db, 'analysis_runs', runId, 'candidates');
  const q = query(col, where('blockId', '==', blockId), orderBy('rank', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

const ogIntersectionCache = new Map<string, OgIntersectionBundle>();

export async function fetchOgIntersectionBundle(
  intersectionReleaseId: string,
  ogId: string,
): Promise<OgIntersectionBundle | null> {
  const key = `${intersectionReleaseId}:${ogId}`;
  const cached = ogIntersectionCache.get(key);
  if (cached) return cached;
  const path = `og_sv_intersections/${intersectionReleaseId}/by_og/${ogId}.json.gz`;
  try {
    const url = await getDownloadURL(storageRef(storage, path));
    const res = await fetch(url);
    if (!res.ok) throw new Error(`og intersection bundle fetch failed (${res.status})`);
    const body = (await res.json()) as OgIntersectionBundle;
    ogIntersectionCache.set(key, body);
    return body;
  } catch (err) {
    // Not every OG has intersections; treat 404 as null.
    if (err instanceof Error && /404|object-not-found/i.test(err.message)) {
      return null;
    }
    throw err;
  }
}

import { collection, collectionGroup, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { CandidateBlock } from '@/types/candidate-block';

/**
 * Coordinate-overlap lookup across every analysis_runs/*\/blocks/*
 * document. Replaces the brittle `entity_analysis_index/region_*`
 * exact-string index described as deprecated in the design-doc.
 *
 * Firestore collection-group query filters by chr; the coordinate
 * overlap check is applied client-side because Firestore cannot
 * express "range overlap" in one query.
 */
export async function findOverlappingBlocks(args: {
  chr: string;
  start: number;
  end: number;
  limit?: number;
}): Promise<CandidateBlock[]> {
  const q = query(collectionGroup(db, 'blocks'), where('region.chr', '==', args.chr));
  const snap = await getDocs(q);
  const matching: CandidateBlock[] = [];
  for (const doc of snap.docs) {
    const data = doc.data() as CandidateBlock;
    if (!data.region) continue;
    if (data.region.start <= args.end && data.region.end >= args.start) {
      matching.push(data);
    }
  }
  matching.sort((a, b) => {
    if (a.curated !== b.curated) return a.curated ? -1 : 1;
    if (b.candidateOgCount !== a.candidateOgCount) {
      return b.candidateOgCount - a.candidateOgCount;
    }
    return a.region.start - b.region.start;
  });
  return typeof args.limit === 'number' ? matching.slice(0, args.limit) : matching;
}

/**
 * Every candidate block on a whole chromosome, across runs, without
 * the window-overlap check. Used by the chromosome-overview thumbnail
 * so navigating to a different window doesn't make curated bars
 * outside that window disappear.
 */
export async function findChrBlocks(chr: string): Promise<CandidateBlock[]> {
  const q = query(collectionGroup(db, 'blocks'), where('region.chr', '==', chr));
  const snap = await getDocs(q);
  const out: CandidateBlock[] = [];
  for (const doc of snap.docs) {
    const data = doc.data() as CandidateBlock;
    if (data.region) out.push(data);
  }
  out.sort((a, b) => a.region.start - b.region.start);
  return out;
}

/**
 * List every block assigned to a specific run — convenience helper
 * for the run overview / block list surfaces.
 */
export async function listRunBlocks(runId: string): Promise<CandidateBlock[]> {
  const col = collection(db, 'analysis_runs', runId, 'blocks');
  const snap = await getDocs(col);
  return snap.docs.map((d) => d.data() as CandidateBlock);
}

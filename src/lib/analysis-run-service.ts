import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  limit,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AnalysisRun, RunId } from '@/types/analysis-run';
import type { Candidate } from '@/types/candidate';

export function subscribeAnalysisRun(
  runId: RunId,
  callback: (run: AnalysisRun | null) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, 'analysis_runs', runId),
    (snap) => callback(snap.exists() ? (snap.data() as AnalysisRun) : null),
    () => callback(null),
  );
}

export async function fetchAnalysisRun(runId: RunId): Promise<AnalysisRun | null> {
  const snap = await getDoc(doc(db, 'analysis_runs', runId));
  return snap.exists() ? (snap.data() as AnalysisRun) : null;
}

export async function listAnalysisRuns(max = 50): Promise<AnalysisRun[]> {
  const q = query(
    collection(db, 'analysis_runs'),
    orderBy('updatedAt', 'desc'),
    limit(max),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as AnalysisRun);
}

export async function fetchCandidates(runId: RunId): Promise<Candidate[]> {
  const col = collection(db, 'analysis_runs', runId, 'candidates');
  const q = query(col, orderBy('rank', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => hydrateCandidate(d.data()));
}

export async function fetchCandidate(
  runId: RunId,
  candidateId: string,
): Promise<Candidate | null> {
  const snap = await getDoc(doc(db, 'analysis_runs', runId, 'candidates', candidateId));
  return snap.exists() ? hydrateCandidate(snap.data()) : null;
}

function hydrateCandidate(data: Record<string, unknown>): Candidate {
  const totalScore = Number(data.totalScore ?? data.combinedScore ?? 0);
  const combinedScore =
    data.combinedScore !== undefined ? Number(data.combinedScore) : null;
  const baseScore =
    data.baseScore !== undefined ? Number(data.baseScore) : null;
  const baseRank =
    data.baseRank !== undefined ? Number(data.baseRank) : null;
  return {
    candidateId: String(data.candidateId ?? ''),
    runId: String(data.runId ?? '') as RunId,
    traitId: data.traitId as Candidate['traitId'],
    candidateType: (data.candidateType ?? 'og_only') as Candidate['candidateType'],
    primaryOgId: (data.primaryOgId as string | null) ?? null,
    leadGeneId: (data.leadGeneId as string | null) ?? null,
    leadRegion: (data.leadRegion as Candidate['leadRegion']) ?? null,
    leadSvId: (data.leadSvId as string | null) ?? null,
    bestSv: (data.bestSv as Candidate['bestSv']) ?? null,
    blockId: (data.blockId as string | null) ?? null,
    rank: Number(data.rank ?? 0),
    baseRank,
    baseScore,
    combinedScore,
    totalScore,
    scoreBreakdown: (data.scoreBreakdown as Candidate['scoreBreakdown']) ?? [],
    groupSpecificitySummary: (data.groupSpecificitySummary as string | null) ?? null,
    functionSummary: (data.functionSummary as string | null) ?? null,
    orthogroupPatternSummary: (data.orthogroupPatternSummary as string | null) ?? null,
    svImpactSummary: (data.svImpactSummary as string | null) ?? null,
    syntenySummary: (data.syntenySummary as string | null) ?? null,
    expressionSummary: (data.expressionSummary as string | null) ?? null,
    qtlSummary: (data.qtlSummary as string | null) ?? null,
    badges: (data.badges as string[]) ?? [],
    storageBundlePath: (data.storageBundlePath as string | null) ?? null,
    createdAt: String(data.createdAt ?? ''),
    pValue: toNumOrNull(data.pValue),
    qValue: toNumOrNull(data.qValue),
    meanDiff: toNumOrNull(data.meanDiff),
    log2FoldChange: toNumOrNull(data.log2FoldChange),
    meansByGroup: (data.meansByGroup as Record<string, number> | null) ?? null,
    presenceByGroup: (data.presenceByGroup as Record<string, number> | null) ?? null,
  };
}

function toNumOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

import type {
  Candidate,
  CandidateBestSv,
  CandidateRegion,
} from '@/types/candidate';
import type { TraitId } from '@/types/traits';

export interface DiscoveryLocusLeadSv {
  eventId: string;
  svType: CandidateBestSv['svType'] | null;
  chr: string | null;
  start: number | null;
  end: number | null;
  impactClass: CandidateBestSv['impactClass'];
  cultivar: string | null;
  geneId: string | null;
  absDeltaAf: number | null;
  traitIds: TraitId[];
}

export interface DiscoveryLocusLead {
  key: string;
  primaryOgId: string | null;
  candidates: Candidate[];
  topCandidate: Candidate;
  traitIds: TraitId[];
  leadGeneIds: string[];
  leadSvs: DiscoveryLocusLeadSv[];
  functionSummary: string | null;
  score: number;
  bestRank: number;
}

interface MutableLead {
  key: string;
  primaryOgId: string | null;
  candidates: Candidate[];
  traitIds: Set<TraitId>;
  leadGeneIds: Set<string>;
  leadSvs: Map<string, MutableLeadSv>;
}

interface MutableLeadSv extends Omit<DiscoveryLocusLeadSv, 'traitIds'> {
  traitIds: Set<TraitId>;
}

export function buildDiscoveryLocusLeads(candidates: Candidate[]): DiscoveryLocusLead[] {
  const byLead = new Map<string, MutableLead>();

  for (const candidate of candidates) {
    const key = leadKey(candidate);
    const lead =
      byLead.get(key) ??
      {
        key,
        primaryOgId: candidate.primaryOgId,
        candidates: [],
        traitIds: new Set<TraitId>(),
        leadGeneIds: new Set<string>(),
        leadSvs: new Map<string, MutableLeadSv>(),
      };

    lead.candidates.push(candidate);
    lead.traitIds.add(candidate.traitId);
    if (candidate.leadGeneId) lead.leadGeneIds.add(candidate.leadGeneId);
    mergeLeadSv(lead, candidate);
    byLead.set(key, lead);
  }

  return Array.from(byLead.values())
    .map(finalizeLead)
    .sort(compareLeads);
}

function leadKey(candidate: Candidate): string {
  if (candidate.primaryOgId) return `og:${candidate.primaryOgId}`;
  return `candidate:${candidate.runId}:${candidate.candidateId}`;
}

function finalizeLead(lead: MutableLead): DiscoveryLocusLead {
  const candidates = [...lead.candidates].sort(compareCandidates);
  const topCandidate = candidates[0];
  const traitIds = Array.from(lead.traitIds).sort();

  return {
    key: lead.key,
    primaryOgId: lead.primaryOgId,
    candidates,
    topCandidate,
    traitIds,
    leadGeneIds: Array.from(lead.leadGeneIds).sort(),
    leadSvs: Array.from(lead.leadSvs.values())
      .map((sv) => ({ ...sv, traitIds: Array.from(sv.traitIds).sort() }))
      .sort(compareLeadSvs),
    functionSummary:
      topCandidate.functionSummary ??
      candidates.find((candidate) => candidate.functionSummary)?.functionSummary ??
      null,
    score: scoreForCandidate(topCandidate),
    bestRank: Math.min(...candidates.map((candidate) => candidate.rank)),
  };
}

function mergeLeadSv(lead: MutableLead, candidate: Candidate) {
  const bestSv = candidate.bestSv;
  const eventId = bestSv?.eventId ?? candidate.leadSvId;
  if (!eventId) return;

  const existing = lead.leadSvs.get(eventId);
  if (existing) {
    existing.traitIds.add(candidate.traitId);
    if (existing.absDeltaAf === null && bestSv?.absDeltaAf !== undefined) {
      existing.absDeltaAf = bestSv.absDeltaAf;
    }
    return;
  }

  lead.leadSvs.set(eventId, {
    eventId,
    svType: bestSv?.svType ?? null,
    chr: bestSv?.chr ?? candidate.leadRegion?.chr ?? null,
    start: bestSv?.start ?? candidate.leadRegion?.start ?? null,
    end: bestSv?.end ?? candidate.leadRegion?.end ?? null,
    impactClass: bestSv?.impactClass ?? null,
    cultivar: bestSv?.cultivar ?? candidate.leadRegion?.cultivar ?? null,
    geneId: bestSv?.geneId ?? null,
    absDeltaAf: bestSv?.absDeltaAf ?? null,
    traitIds: new Set([candidate.traitId]),
  });
}

function compareCandidates(a: Candidate, b: Candidate): number {
  const scoreDelta = scoreForCandidate(b) - scoreForCandidate(a);
  if (scoreDelta !== 0) return scoreDelta;
  if (a.rank !== b.rank) return a.rank - b.rank;
  return a.candidateId.localeCompare(b.candidateId);
}

function compareLeads(a: DiscoveryLocusLead, b: DiscoveryLocusLead): number {
  if (a.traitIds.length !== b.traitIds.length) {
    return b.traitIds.length - a.traitIds.length;
  }
  const scoreDelta = b.score - a.score;
  if (scoreDelta !== 0) return scoreDelta;
  if (a.bestRank !== b.bestRank) return a.bestRank - b.bestRank;
  return a.key.localeCompare(b.key);
}

function compareLeadSvs(a: DiscoveryLocusLeadSv, b: DiscoveryLocusLeadSv): number {
  const aDelta = a.absDeltaAf ?? -1;
  const bDelta = b.absDeltaAf ?? -1;
  if (aDelta !== bDelta) return bDelta - aDelta;
  if (a.traitIds.length !== b.traitIds.length) {
    return b.traitIds.length - a.traitIds.length;
  }
  return a.eventId.localeCompare(b.eventId);
}

function scoreForCandidate(candidate: Candidate): number {
  return candidate.combinedScore ?? candidate.totalScore;
}

export function regionUrlForCandidateRegion(region: CandidateRegion): string {
  return `/region/${region.cultivar}/${region.chr}/${region.start}-${region.end}`;
}

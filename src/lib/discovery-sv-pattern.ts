import type { Candidate } from '@/types/candidate';
import type { CandidateBlock } from '@/types/candidate-block';
import type { ImpactClass, SvType } from '@/types/intersection';
import { impactWeightedSvScore } from '@/lib/impact-score';
import type {
  SvEventGroupFreq,
  SvGroupFreq,
  SvTraitGroupFreqBundle,
} from '@/types/sv-event';
import type { TraitId } from '@/types/traits';

export interface SvPatternFreqEntry {
  bundle: SvTraitGroupFreqBundle;
  byEvent: Record<string, SvEventGroupFreq>;
}

export type SvPatternFreqByTrait = Partial<Record<TraitId, SvPatternFreqEntry>>;

export interface SvPatternSource {
  eventId: string;
  traitId: TraitId;
  svType: SvType | null;
  chr: string | null;
  start: number | null;
  end: number | null;
  impactClass: ImpactClass | null;
  cultivar: string | null;
  geneId: string | null;
  absDeltaAf: number | null;
  candidate: Candidate | null;
  block: CandidateBlock | null;
}

export interface SvPatternRow extends SvPatternSource {
  groups: Array<{ label: string; freq: SvGroupFreq | null }>;
  spread: number | null;
  score: number | null;
}

const PRIORITY_SCORE_MIN = 0.7;
const CODING_OR_UTR_GAP_MIN = 0.5;
const PROMOTER_GAP_MIN = 0.8;

const CODING_OR_UTR_IMPACTS = new Set<ImpactClass>([
  'coding_or_splice',
  'utr',
  'cds_disruption',
]);
const PROMOTER_IMPACTS = new Set<ImpactClass>(['promoter_2kb', 'promoter']);

export function collectLeadSvSources(
  candidates: Candidate[],
  blocks: CandidateBlock[],
): SvPatternSource[] {
  const byKey = new Map<string, SvPatternSource>();
  const blocksByKey = new Map(blocks.map((block) => [`${block.runId}:${block.blockId}`, block]));

  for (const candidate of candidates) {
    const eventId = candidate.bestSv?.eventId ?? candidate.leadSvId;
    if (!eventId) continue;
    mergeSource(byKey, {
      eventId,
      traitId: candidate.traitId,
      svType: candidate.bestSv?.svType ?? null,
      chr: candidate.bestSv?.chr ?? candidate.leadRegion?.chr ?? null,
      start: candidate.bestSv?.start ?? candidate.leadRegion?.start ?? null,
      end: candidate.bestSv?.end ?? candidate.leadRegion?.end ?? null,
      impactClass: candidate.bestSv?.impactClass ?? null,
      cultivar: candidate.bestSv?.cultivar ?? candidate.leadRegion?.cultivar ?? null,
      geneId: candidate.bestSv?.geneId ?? candidate.leadGeneId,
      absDeltaAf: candidate.bestSv?.absDeltaAf ?? null,
      candidate,
      block: candidate.blockId
        ? blocksByKey.get(`${candidate.runId}:${candidate.blockId}`) ?? null
        : null,
    });
  }

  for (const block of blocks) {
    for (const sv of block.leadSvs) {
      mergeSource(byKey, {
        eventId: sv.eventId,
        traitId: block.traitId,
        svType: sv.svType,
        chr: sv.chr,
        start: sv.start,
        end: sv.end,
        impactClass: sv.impactClass,
        cultivar: sv.cultivar,
        geneId: sv.geneId,
        absDeltaAf: sv.absDeltaAf,
        candidate: null,
        block,
      });
    }
  }

  return Array.from(byKey.values());
}

export function buildSvPatternRows(
  sources: SvPatternSource[],
  byTrait: SvPatternFreqByTrait,
): SvPatternRow[] {
  return sources
    .map((source) => {
      const entry = byTrait[source.traitId];
      const freqRow = entry?.byEvent[source.eventId] ?? null;
      const labels = entry?.bundle.groupLabels ?? source.block?.groupLabels ?? [];
      const groups = labels.map((label) => ({
        label,
        freq: freqRow?.byGroup[label] ?? null,
      }));
      const spread = spreadForGroups(groups);
      return {
        ...source,
        groups,
        spread,
        score: impactWeightedSvScore(spread, source.impactClass),
      };
    })
    .sort(compareRows);
}

export function isHighPrioritySvPattern(row: SvPatternRow): boolean {
  if (row.score !== null && row.score >= PRIORITY_SCORE_MIN) return true;
  if (row.spread === null || !row.impactClass) return false;
  if (CODING_OR_UTR_IMPACTS.has(row.impactClass)) {
    return row.spread >= CODING_OR_UTR_GAP_MIN;
  }
  if (PROMOTER_IMPACTS.has(row.impactClass)) {
    return row.spread >= PROMOTER_GAP_MIN;
  }
  return false;
}

export function priorityReasonForSvPattern(row: SvPatternRow): string | null {
  if (row.score !== null && row.score >= PRIORITY_SCORE_MIN) return 'priority score';
  if (row.spread === null || !row.impactClass) return null;
  if (CODING_OR_UTR_IMPACTS.has(row.impactClass) && row.spread >= CODING_OR_UTR_GAP_MIN) {
    return 'coding/UTR gap';
  }
  if (PROMOTER_IMPACTS.has(row.impactClass) && row.spread >= PROMOTER_GAP_MIN) {
    return 'promoter gap';
  }
  return null;
}

function mergeSource(map: Map<string, SvPatternSource>, source: SvPatternSource) {
  const key = `${source.traitId}:${source.eventId}`;
  const existing = map.get(key);
  if (!existing) {
    map.set(key, source);
    return;
  }

  map.set(key, {
    ...existing,
    svType: existing.svType ?? source.svType,
    chr: existing.chr ?? source.chr,
    start: existing.start ?? source.start,
    end: existing.end ?? source.end,
    impactClass: existing.impactClass ?? source.impactClass,
    cultivar: existing.cultivar ?? source.cultivar,
    geneId: existing.geneId ?? source.geneId,
    absDeltaAf: maxNullable(existing.absDeltaAf, source.absDeltaAf),
    candidate: existing.candidate ?? source.candidate,
    block: existing.block ?? source.block,
  });
}

function compareRows(a: SvPatternRow, b: SvPatternRow): number {
  const scoreDelta = (b.score ?? -1) - (a.score ?? -1);
  if (scoreDelta !== 0) return scoreDelta;
  const spreadDelta = (b.spread ?? -1) - (a.spread ?? -1);
  if (spreadDelta !== 0) return spreadDelta;
  const deltaDelta = (b.absDeltaAf ?? -1) - (a.absDeltaAf ?? -1);
  if (deltaDelta !== 0) return deltaDelta;
  if (a.traitId !== b.traitId) return a.traitId.localeCompare(b.traitId);
  return a.eventId.localeCompare(b.eventId);
}

function spreadForGroups(groups: SvPatternRow['groups']): number | null {
  const freqs = groups
    .map((group) => group.freq?.freq)
    .filter((freq): freq is number => typeof freq === 'number');
  if (freqs.length < 2) return null;
  return Math.max(...freqs) - Math.min(...freqs);
}

function maxNullable(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.max(a, b);
}

import type { OrthogroupDiffEntry } from '@/types/orthogroup';
import type {
  Candidate,
  CandidateAxisScore,
  CandidateType,
} from '@/types/candidate';
import type { RunId } from '@/types/analysis-run';
import type { TraitId } from '@/types/traits';

export interface ScoringInputs {
  runId: RunId;
  traitId: TraitId;
  entries: OrthogroupDiffEntry[];
  scoringVersion: number;
}

const GROUP_SPECIFICITY_MAX = 20;
const FUNCTION_MAX = 1;
const OG_PATTERN_MAX = 1;

export function deriveCandidates(inputs: ScoringInputs): Candidate[] {
  const { runId, traitId, entries } = inputs;
  const scored = entries
    .map((e) => scoreEntry(runId, traitId, e))
    .filter((c): c is Candidate => c !== null);
  scored.sort((a, b) => b.totalScore - a.totalScore);
  return scored.map((c, i) => ({ ...c, rank: i + 1 }));
}

function scoreEntry(
  runId: RunId,
  traitId: TraitId,
  entry: OrthogroupDiffEntry,
): Candidate | null {
  if (!Number.isFinite(entry.pValue) || entry.pValue > 0.05) return null;

  const groupSpecificity = computeGroupSpecificity(entry);
  const functionScore = computeFunctionScore(entry);
  const ogPattern = computeOgPatternScore(entry);

  const normGs = Math.min(groupSpecificity.score ?? 0, GROUP_SPECIFICITY_MAX) / GROUP_SPECIFICITY_MAX;
  const normFn = (functionScore.score ?? 0) / FUNCTION_MAX;
  const normOg = (ogPattern.score ?? 0) / OG_PATTERN_MAX;
  const totalScore = 0.5 * normGs + 0.25 * normFn + 0.25 * normOg;

  const scoreBreakdown: CandidateAxisScore[] = [
    groupSpecificity,
    functionScore,
    ogPattern,
    { axis: 'sv_impact', status: 'pending', score: null, note: 'Awaiting SV matrix (Phase 3)' },
    { axis: 'synteny', status: 'partial', score: null, note: 'Cluster-local halLiftover only' },
    { axis: 'expression', status: 'pending', score: null, note: 'Bulk RNA-seq pending' },
    { axis: 'qtl', status: 'external_future', score: null, note: 'External QTL/GWAS DB integration deferred' },
  ];

  const candidateType: CandidateType = 'og_only';
  const candidateId = `${entry.orthogroup}`;
  const primaryDescription = entry.representative
    ? Object.values(entry.representative.descriptions ?? {}).find((d) => d && d !== 'NA') ?? null
    : null;

  return {
    candidateId,
    runId,
    traitId,
    candidateType,
    primaryOgId: entry.orthogroup,
    leadGeneId: entry.representative?.transcripts[0] ?? null,
    leadRegion: null,
    leadSvId: null,
    rank: 0,
    totalScore,
    scoreBreakdown,
    groupSpecificitySummary: formatGroupSpecificity(entry),
    functionSummary: primaryDescription,
    orthogroupPatternSummary: formatOgPattern(entry),
    svImpactSummary: null,
    syntenySummary: null,
    expressionSummary: null,
    qtlSummary: null,
    badges: [],
    storageBundlePath: null,
    createdAt: '',
  };
}

function computeGroupSpecificity(entry: OrthogroupDiffEntry): CandidateAxisScore {
  const lfc = Math.abs(entry.log2FoldChange ?? 0);
  const minus_log10_p = entry.pValue > 0 ? -Math.log10(entry.pValue) : 0;
  const score = minus_log10_p * (1 + lfc);
  return {
    axis: 'group_specificity',
    status: 'ready',
    score: Number.isFinite(score) ? score : 0,
    note: `MWU p=${entry.pValue.toExponential(1)}${entry.log2FoldChange !== null ? `, log2FC=${entry.log2FoldChange.toFixed(2)}` : ''}`,
  };
}

function computeFunctionScore(entry: OrthogroupDiffEntry): CandidateAxisScore {
  const descs = entry.representative?.descriptions ?? {};
  const real = Object.values(descs).filter((d) => d && d !== 'NA');
  if (real.length === 0) {
    return { axis: 'function', status: 'ready', score: 0, note: 'No functional annotation' };
  }
  return {
    axis: 'function',
    status: 'ready',
    score: 1,
    note: `${real.length} IRGSP descriptor${real.length === 1 ? '' : 's'}`,
  };
}

function computeOgPatternScore(entry: OrthogroupDiffEntry): CandidateAxisScore {
  const presenceValues = Object.values(entry.presenceByGroup);
  if (presenceValues.length < 2) {
    return { axis: 'og_pattern', status: 'ready', score: 0, note: 'Single group' };
  }
  const maxP = Math.max(...presenceValues);
  const minP = Math.min(...presenceValues);
  const gap = maxP - minP;
  return {
    axis: 'og_pattern',
    status: 'ready',
    score: Math.max(0, Math.min(1, gap)),
    note: `Presence gap ${gap.toFixed(2)} between groups`,
  };
}

function formatGroupSpecificity(entry: OrthogroupDiffEntry): string {
  const parts: string[] = [];
  parts.push(`Δmean ${entry.meanDiff.toFixed(2)}`);
  if (entry.log2FoldChange !== null) {
    parts.push(`log₂FC ${entry.log2FoldChange.toFixed(2)}`);
  }
  parts.push(`p ${entry.pValue < 1e-4 ? entry.pValue.toExponential(1) : entry.pValue.toFixed(3)}`);
  return parts.join(' · ');
}

function formatOgPattern(entry: OrthogroupDiffEntry): string {
  const labels = Object.keys(entry.presenceByGroup);
  return labels
    .map((l) => `${l}: ${(entry.presenceByGroup[l] * 100).toFixed(0)}% present`)
    .join(' vs ');
}

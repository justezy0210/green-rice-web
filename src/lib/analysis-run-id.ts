import type { TraitId } from '@/types/traits';
import type { RunId, RunIdParts } from '@/types/analysis-run';

const TRAIT_IDS: ReadonlySet<TraitId> = new Set<TraitId>([
  'heading_date',
  'culm_length',
  'panicle_length',
  'panicle_number',
  'spikelets_per_panicle',
  'ripening_rate',
  'grain_weight',
  'pre_harvest_sprouting',
  'bacterial_leaf_blight',
]);

export function encodeRunId(parts: RunIdParts): RunId {
  const { traitId, groupingVersion, orthofinderVersion, svReleaseVersion, geneModelVersion, scoringVersion } = parts;
  return `${traitId}_g${groupingVersion}_of${orthofinderVersion}_sv${svReleaseVersion}_gm${geneModelVersion}_sc${scoringVersion}`;
}

const RUN_ID_PATTERN = /^([a-z_]+)_g(\d+)_of(\d+)_sv(\d+)_gm(\d+)_sc(\d+)$/;

export function decodeRunId(runId: RunId): RunIdParts | null {
  const match = RUN_ID_PATTERN.exec(runId);
  if (!match) return null;
  const [, traitCandidate, g, of, sv, gm, sc] = match;
  if (!TRAIT_IDS.has(traitCandidate as TraitId)) return null;
  return {
    traitId: traitCandidate as TraitId,
    groupingVersion: Number(g),
    orthofinderVersion: Number(of),
    svReleaseVersion: Number(sv),
    geneModelVersion: Number(gm),
    scoringVersion: Number(sc),
  };
}

export function isValidRunId(runId: string): runId is RunId {
  return decodeRunId(runId) !== null;
}

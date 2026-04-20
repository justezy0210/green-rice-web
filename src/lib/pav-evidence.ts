/**
 * PAV evidence classification — Stage 2 MVP (3-class).
 *
 * scope.md 2026-04-20 defines 6 allowed evidence-graded PAV classes.
 * This module ships the narrow subset derivable from annotation counts
 * alone. gene-model completeness and synteny-backed absence require
 * data that is not yet integrated; those classes are deferred to
 * Stage 2.5.
 *
 * **Not validation-grade.** These classes summarize the observable
 * annotation state only. They do not assert biological presence or
 * absence.
 */

import { isReferencePathCultivar } from '@/lib/irgsp-constants';

export type PavClass = 'present' | 'absent-evidence-pending' | 'duplicated';

export interface PavPerCultivar {
  cultivar: string;
  pavClass: PavClass;
  geneCount: number;
  geneIds: string[];
}

export function classifyPavEvidence(
  members: Record<string, string[]> | null,
  cultivars: string[],
): PavPerCultivar[] {
  return cultivars
    .filter((c) => !isReferencePathCultivar(c))
    .map((cultivar) => {
      const geneIds = members?.[cultivar] ?? [];
      let pavClass: PavClass;
      if (geneIds.length === 0) pavClass = 'absent-evidence-pending';
      else if (geneIds.length === 1) pavClass = 'present';
      else pavClass = 'duplicated';
      return {
        cultivar,
        pavClass,
        geneCount: geneIds.length,
        geneIds,
      };
    });
}

export interface PavSummaryCounts {
  present: number;
  absentEvidencePending: number;
  duplicated: number;
  total: number;
}

export function summarizePav(rows: PavPerCultivar[]): PavSummaryCounts {
  const s: PavSummaryCounts = {
    present: 0,
    absentEvidencePending: 0,
    duplicated: 0,
    total: rows.length,
  };
  for (const r of rows) {
    if (r.pavClass === 'present') s.present++;
    else if (r.pavClass === 'absent-evidence-pending') s.absentEvidencePending++;
    else if (r.pavClass === 'duplicated') s.duplicated++;
  }
  return s;
}

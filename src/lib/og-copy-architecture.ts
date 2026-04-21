/**
 * OG copy architecture classification.
 *
 * Derives two orthogonal summaries from a per-cultivar copy-count map
 * (reference cultivar already excluded):
 *
 *   - coreClass: panel presence category (scope.md 2026-04-20)
 *       core        N == panelSize
 *       soft-core   N >= panelSize - 2   (but not core)
 *       shell       2 <= N < panelSize - 2
 *       private     N == 1
 *       absent      N == 0  (edge case; OG present nowhere in panel)
 *
 *   - architectureLabel: a short human phrase describing copy shape —
 *     "all singleton", "expansion in <k> cultivars (×<max>)", etc.
 *
 * Both are panel-scoped and do NOT claim biology. They just summarize
 * the observed annotation counts.
 */

export type CoreShellClass =
  | 'core'
  | 'soft-core'
  | 'shell'
  | 'private'
  | 'absent';

export interface CopyArchitecture {
  panelSize: number;
  present: number;
  absent: number;
  singleton: number;
  multiCopy: number;
  maxCopy: number;
  coreClass: CoreShellClass;
  architectureLabel: string;
}

export function classifyCopyArchitecture(
  copyCountByCultivar: Record<string, number>,
): CopyArchitecture {
  const counts = Object.values(copyCountByCultivar);
  const panelSize = counts.length;
  let present = 0;
  let singleton = 0;
  let multiCopy = 0;
  let maxCopy = 0;
  for (const c of counts) {
    if (c >= 1) present++;
    if (c === 1) singleton++;
    if (c >= 2) {
      multiCopy++;
      if (c > maxCopy) maxCopy = c;
    }
  }
  const absent = panelSize - present;

  let coreClass: CoreShellClass;
  if (present === 0) coreClass = 'absent';
  else if (present === panelSize) coreClass = 'core';
  else if (present === 1) coreClass = 'private';
  else if (present >= panelSize - 2) coreClass = 'soft-core';
  else coreClass = 'shell';

  const architectureLabel = labelFor({
    panelSize,
    present,
    absent,
    singleton,
    multiCopy,
    maxCopy,
  });

  return {
    panelSize,
    present,
    absent,
    singleton,
    multiCopy,
    maxCopy,
    coreClass,
    architectureLabel,
  };
}

function labelFor(s: {
  panelSize: number;
  present: number;
  absent: number;
  singleton: number;
  multiCopy: number;
  maxCopy: number;
}): string {
  if (s.present === 0) return 'Not observed in any panel cultivar';
  if (s.present === 1) return 'Private — 1 cultivar only';
  if (s.multiCopy === 0 && s.present === s.panelSize) {
    return 'All 16 present, all singleton';
  }
  if (s.multiCopy === 0) {
    return `${s.present} singleton, ${s.absent} absent`;
  }
  // Multi-copy present
  const parts: string[] = [];
  if (s.multiCopy > 0) {
    parts.push(`${s.multiCopy} multi-copy (×${s.maxCopy} max)`);
  }
  if (s.singleton > 0) parts.push(`${s.singleton} singleton`);
  if (s.absent > 0) parts.push(`${s.absent} absent`);
  return parts.join(', ');
}

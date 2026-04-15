import type { CultivarGroupAssignment } from '@/types/grouping';

// Distinct palette that avoids conflicting with phenotype category colors
// (green/blue/amber/red/purple) and BLB resistance indicators (green/red).
export const GROUP_PALETTE: { bg: string; border: string }[] = [
  { bg: 'rgba(139, 92, 246, 0.75)', border: 'rgba(109, 40, 217, 1)' },   // violet — low group
  { bg: 'rgba(20, 184, 166, 0.75)', border: 'rgba(15, 118, 110, 1)' },   // teal — high group
  { bg: 'rgba(236, 72, 153, 0.75)', border: 'rgba(190, 24, 93, 1)' },    // fuchsia — third group (k=3)
];
export const UNASSIGNED_COLOR = {
  bg: 'rgba(156, 163, 175, 0.5)',
  border: 'rgba(107, 114, 128, 0.8)',
};

export function buildGroupColorMap(
  assignments: Record<string, CultivarGroupAssignment>,
): Record<string, { bg: string; border: string }> {
  if (!assignments || Object.keys(assignments).length === 0) return {};
  const labelToScores: Record<string, number[]> = {};
  for (const a of Object.values(assignments)) {
    if (!labelToScores[a.groupLabel]) labelToScores[a.groupLabel] = [];
    labelToScores[a.groupLabel].push(a.indexScore);
  }
  const meansByLabel = Object.entries(labelToScores).map(([lbl, scores]) => ({
    lbl,
    mean: scores.reduce((a, b) => a + b, 0) / scores.length,
  }));
  meansByLabel.sort((a, b) => a.mean - b.mean);
  const map: Record<string, { bg: string; border: string }> = {};
  meansByLabel.forEach((entry, i) => {
    map[entry.lbl] = GROUP_PALETTE[i] ?? UNASSIGNED_COLOR;
  });
  return map;
}

export function traitButtonClass(category: string, isActive: boolean): string {
  if (category === 'heading')
    return isActive
      ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
      : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
  if (category === 'morphology')
    return isActive
      ? 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700'
      : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100';
  if (category === 'yield')
    return isActive
      ? 'bg-green-600 text-white border-green-600 hover:bg-green-700'
      : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100';
  if (category === 'quality')
    return isActive
      ? 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600'
      : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100';
  if (category === 'resistance')
    return isActive
      ? 'bg-red-600 text-white border-red-600 hover:bg-red-700'
      : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100';
  return '';
}

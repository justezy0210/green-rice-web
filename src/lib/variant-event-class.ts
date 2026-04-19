/**
 * Length-based variant event-class classifier for display.
 *
 * This is a heuristic. `vg deconstruct` can split a single structural event
 * across multiple SNP-like rows via nested bubble decomposition, so a row
 * classified as SNP is not a guarantee that the underlying event is a SNP.
 * UI copy must state this in the legend.
 */

export type EventClass = 'SNP' | 'indel-ins' | 'indel-del' | 'SV-like';

export const SV_THRESHOLD_BP = 50;

export function classifyVariant(ref: string, alt: string): EventClass {
  const refLen = ref.length;
  const altLen = alt.length;
  const maxLen = Math.max(refLen, altLen);

  if (maxLen >= SV_THRESHOLD_BP) return 'SV-like';
  if (refLen === 1 && altLen === 1) return 'SNP';
  if (altLen > refLen) return 'indel-ins';
  if (refLen > altLen) return 'indel-del';
  // equal length, >1bp: treat as MNV-ish; surface as SNP for simplicity
  return 'SNP';
}

export function shouldShowLength(ref: string, alt: string): boolean {
  return Math.max(ref.length, alt.length) > 20;
}

export function eventClassBadgeClass(cls: EventClass): string {
  switch (cls) {
    case 'SV-like':
      return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'indel-ins':
    case 'indel-del':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'SNP':
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

import type {
  SvEvent,
  SvEventGroupFreq,
  SvGroupFreq,
} from '@/types/sv-event';

export type SvGenotypeState = 'alt' | 'ref' | 'missing';

export interface SvGenotypeSummary {
  alt: string[];
  ref: string[];
  missing: string[];
}

export interface SvRegionWindow {
  chr: string;
  start: number;
  end: number;
}

export const SV_EVENT_ID_PATTERN = /^EV\d{7}$/;

export function canonicalizeSvEventId(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const match = /^ev(\d{7})$/i.exec(trimmed);
  return match ? `EV${match[1]}` : null;
}

export function isCanonicalSvEventId(value: string | null | undefined): value is string {
  return typeof value === 'string' && SV_EVENT_ID_PATTERN.test(value);
}

export function svGenotypeState(gt: string | null | undefined): SvGenotypeState {
  const value = gt?.trim();
  if (!value || value === '.') return 'missing';

  const alleles = value.split(/[|/]/).filter((allele) => allele !== '');
  const observed = alleles.filter((allele) => allele !== '.');
  if (observed.length === 0) return 'missing';
  return observed.some((allele) => allele !== '0') ? 'alt' : 'ref';
}

export function svHasAlt(gt: string | null | undefined): boolean {
  return svGenotypeState(gt) === 'alt';
}

export function summarizeSvGenotypes(
  event: SvEvent,
  samples: readonly string[],
): SvGenotypeSummary {
  const summary: SvGenotypeSummary = { alt: [], ref: [], missing: [] };
  for (const sample of samples) {
    summary[svGenotypeState(event.gts[sample])].push(sample);
  }
  return summary;
}

export function svFootprintEnd(event: SvEvent): number {
  return event.pos + Math.max(1, event.refLen, event.altLen);
}

export function svRegionWindow(event: SvEvent, padding = 5000): SvRegionWindow {
  return {
    chr: event.chr,
    start: Math.max(0, event.pos - padding),
    end: svFootprintEnd(event) + padding,
  };
}

export function formatSvCoordinate(event: SvEvent): string {
  const end = svFootprintEnd(event);
  if (event.pos === end) return `${event.chr}:${event.pos.toLocaleString()}`;
  return `${event.chr}:${event.pos.toLocaleString()}-${end.toLocaleString()}`;
}

export function svGroupSpread(freq: SvEventGroupFreq | null | undefined): number | null {
  const freqs = Object.values(freq?.byGroup ?? {})
    .map((group) => group.freq)
    .filter((value): value is number => typeof value === 'number');
  if (freqs.length < 2) return null;
  return Math.max(...freqs) - Math.min(...freqs);
}

export function svGroupsInOrder(
  freq: SvEventGroupFreq | null | undefined,
  groupLabels: readonly string[],
): Array<{ label: string; freq: SvGroupFreq | null }> {
  return groupLabels.map((label) => ({
    label,
    freq: freq?.byGroup[label] ?? null,
  }));
}

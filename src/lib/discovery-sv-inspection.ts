import { traitGroupForCultivar } from '@/lib/trait-grouping';
import type { SvPatternRow } from '@/lib/discovery-sv-pattern';
import type { SvEvent, SvGroupFreq } from '@/types/sv-event';

const REF_CULTIVAR = 'baegilmi';
const REGION_FLANK_BP = 20_000;

export interface SvGroupDirection {
  label: string;
  summary: string;
}

export interface SvRegionTarget {
  url: string;
  cultivar: string;
  groupLabel: string | null;
  altCarrier: boolean;
}

export function describeSvGroupDirection(row: SvPatternRow): SvGroupDirection | null {
  const sorted = groupsWithFreq(row).sort((a, b) => b.freq.freq - a.freq.freq);
  if (sorted.length === 0) return null;
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];
  const label = top.freq.freq === bottom.freq.freq
    ? 'ALT frequency similar across groups'
    : `${row.svType ?? 'SV'} ALT enriched in ${top.label}`;
  const summary = top.freq.freq === bottom.freq.freq
    ? formatFreq(top)
    : `${formatFreq(top)} vs ${bottom.label} ${bottom.freq.alt}/${bottom.freq.total}`;
  return { label, summary };
}

export function regionTargetForSvPatternRow(
  row: SvPatternRow,
  event: SvEvent | null,
  samples: string[],
): SvRegionTarget | null {
  const topGroup = topAltGroup(row)?.label ?? null;
  const cultivar = chooseRegionCultivar(row, event, samples, topGroup);
  const chr = row.chr ?? event?.chr ?? row.candidate?.leadRegion?.chr ?? null;
  const rawStart = row.start ?? event?.pos ?? row.candidate?.leadRegion?.start ?? null;
  const rawEnd =
    row.end ??
    (event ? event.pos + Math.max(event.refLen, 1) : row.candidate?.leadRegion?.end) ??
    null;

  if (!cultivar || !chr || rawStart === null || rawEnd === null) return null;
  const start = Math.max(0, Math.min(rawStart, rawEnd) - REGION_FLANK_BP);
  const end = Math.max(start + 1, Math.max(rawStart, rawEnd) + REGION_FLANK_BP);
  const groupLabel = traitGroupForCultivar(row.traitId, cultivar)?.groupLabel ?? null;
  return {
    url: `/region/${cultivar}/${chr}/${start}-${end}?svScope=cultivar&sv=${encodeURIComponent(row.eventId)}`,
    cultivar,
    groupLabel,
    altCarrier: event ? gtHasAlt(event.gts[cultivar]) : false,
  };
}

function chooseRegionCultivar(
  row: SvPatternRow,
  event: SvEvent | null,
  samples: string[],
  topGroup: string | null,
): string | null {
  if (event) {
    const altSamples = samples.filter((sample) => gtHasAlt(event.gts[sample]));
    const topGroupAltSamples = topGroup
      ? altSamples.filter(
          (sample) => traitGroupForCultivar(row.traitId, sample)?.groupLabel === topGroup,
        )
      : [];
    return (
      topGroupAltSamples.find((sample) => sample !== REF_CULTIVAR) ??
      topGroupAltSamples[0] ??
      altSamples.find((sample) => sample !== REF_CULTIVAR) ??
      altSamples[0] ??
      fallbackCultivar(row)
    );
  }
  const fallback = fallbackCultivar(row);
  return fallback === REF_CULTIVAR ? null : fallback;
}

function fallbackCultivar(row: SvPatternRow): string | null {
  return row.cultivar ?? row.candidate?.leadRegion?.cultivar ?? null;
}

function topAltGroup(row: SvPatternRow) {
  return groupsWithFreq(row).sort((a, b) => b.freq.freq - a.freq.freq)[0] ?? null;
}

function groupsWithFreq(row: SvPatternRow): Array<{ label: string; freq: SvGroupFreq }> {
  return row.groups.filter(
    (group): group is { label: string; freq: SvGroupFreq } => group.freq !== null,
  );
}

function formatFreq(group: { label: string; freq: SvGroupFreq }): string {
  return `${group.label} ${group.freq.alt}/${group.freq.total}`;
}

function gtHasAlt(gt: string | undefined): boolean {
  return Boolean(gt && gt !== '.' && gt !== '0');
}

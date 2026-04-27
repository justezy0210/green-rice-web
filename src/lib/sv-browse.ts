import {
  summarizeSvGenotypes,
  svFootprintEnd,
} from '@/lib/sv-event-helpers';
import type { SvEvent, SvType } from '@/types/sv-event';

export type SvSizeFilter = 'all' | '50-99' | '100-999' | '1k-9k' | '10k-plus';
export type SvCarrierFilter = 'all' | 'any-alt' | 'private-alt' | 'shared-alt';

export interface SvBrowseRow {
  event: SvEvent;
  end: number;
  altCount: number;
  refCount: number;
  missingCount: number;
}

export interface SvBrowseFilters {
  query: string;
  type: SvType | 'all';
  chr: string;
  size: SvSizeFilter;
  carrier: SvCarrierFilter;
}

export function buildSvBrowseRows(
  eventsByChr: Record<string, SvEvent[]>,
  samples: readonly string[],
): SvBrowseRow[] {
  const rows: SvBrowseRow[] = [];
  for (const events of Object.values(eventsByChr)) {
    for (const event of events) {
      const summary = summarizeSvGenotypes(event, samples);
      rows.push({
        event,
        end: svFootprintEnd(event),
        altCount: summary.alt.length,
        refCount: summary.ref.length,
        missingCount: summary.missing.length,
      });
    }
  }
  rows.sort(compareSvRows);
  return rows;
}

export function filterSvBrowseRows(
  rows: readonly SvBrowseRow[],
  filters: SvBrowseFilters,
): SvBrowseRow[] {
  const query = filters.query.trim().toLowerCase();
  return rows.filter((row) => {
    const event = row.event;
    if (filters.type !== 'all' && event.svType !== filters.type) return false;
    if (filters.chr !== 'all' && event.chr !== filters.chr) return false;
    if (!matchesSize(event.svLenAbs, filters.size)) return false;
    if (!matchesCarrier(row.altCount, filters.carrier)) return false;
    if (query) {
      const haystack = `${event.eventId} ${event.originalId} ${event.chr}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

function compareSvRows(a: SvBrowseRow, b: SvBrowseRow): number {
  const chr = compareSvChr(a.event.chr, b.event.chr);
  if (chr !== 0) return chr;
  if (a.event.pos !== b.event.pos) return a.event.pos - b.event.pos;
  return a.event.eventId.localeCompare(b.event.eventId);
}

export function compareSvChr(a: string, b: string): number {
  const na = chrNumber(a);
  const nb = chrNumber(b);
  if (na !== null && nb !== null && na !== nb) return na - nb;
  if (na !== null && nb === null) return -1;
  if (na === null && nb !== null) return 1;
  return a.localeCompare(b);
}

function chrNumber(chr: string): number | null {
  const match = /^chr0?(\d+)$/i.exec(chr);
  return match ? Number(match[1]) : null;
}

function matchesSize(size: number, filter: SvSizeFilter): boolean {
  switch (filter) {
    case '50-99':
      return size >= 50 && size < 100;
    case '100-999':
      return size >= 100 && size < 1000;
    case '1k-9k':
      return size >= 1000 && size < 10000;
    case '10k-plus':
      return size >= 10000;
    case 'all':
      return true;
  }
}

function matchesCarrier(altCount: number, filter: SvCarrierFilter): boolean {
  switch (filter) {
    case 'any-alt':
      return altCount > 0;
    case 'private-alt':
      return altCount === 1;
    case 'shared-alt':
      return altCount > 1;
    case 'all':
      return true;
  }
}

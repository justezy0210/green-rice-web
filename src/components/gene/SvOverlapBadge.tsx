import type { GeneSvEntry } from '@/types/gene-sv-index';

interface Props {
  entry: GeneSvEntry | null;
}

function typeBreakdown(t: string): string {
  const parts: string[] = [];
  if (t.includes('I')) parts.push('INS');
  if (t.includes('D')) parts.push('DEL');
  if (t.includes('C')) parts.push('COMPLEX');
  return parts.length ? parts.join(', ') : '—';
}

/**
 * Row-level badge for gene search results. Surfaces sample-frame SV
 * overlap evidence for the gene's own cultivar against its
 * representative transcript. Strong tier (CDS exon or canonical splice
 * site ±2 bp) gets a filled amber badge; weak-only tier (UTR / intron /
 * ±2 kb flank) gets a dimmed outline. Neither → nothing rendered.
 *
 * Framing is observational by design: the tooltip explicitly labels the
 * signal as evidence, not validation-grade impact.
 */
export function SvOverlapBadge({ entry }: Props) {
  if (!entry) return null;
  if (entry.s === 0 && entry.w === 0) return null;

  if (entry.s === 1) {
    const tip =
      `SV overlap evidence — representative transcript\n` +
      `${entry.n} locus${entry.n === 1 ? '' : 'i'} · ${typeBreakdown(entry.t)}\n` +
      (entry.c > 0 ? `${entry.c} cultivars in this OG carry a strong-tier SV\n` : '') +
      `Observational — not validation-grade`;
    return (
      <span
        title={tip}
        className="text-[9px] font-mono uppercase tracking-wide px-1 py-[1px] rounded border border-amber-400 bg-amber-100 text-amber-900"
      >
        SV
      </span>
    );
  }

  // Weak only — dim outline
  const weakTip =
    `Weak-tier SV overlap only (UTR / intron / ±2 kb flank)\n` +
    `Representative transcript · Observational`;
  return (
    <span
      title={weakTip}
      className="text-[9px] font-mono uppercase tracking-wide px-1 py-[1px] rounded border border-gray-300 bg-white text-gray-500"
    >
      SV·w
    </span>
  );
}
